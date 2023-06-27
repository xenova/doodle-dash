import { pipeline, env } from "@xenova/transformers";

// Disable local models
env.allowLocalModels = false;

// Define model factories
// Ensures only one model is created of each type
class Singleton {
    static task = null;
    static model = null;
    static quantized = null;
    static instance = null;

    constructor(tokenizer, model, quantized) {
        this.tokenizer = tokenizer;
        this.model = model;
        this.quantized = quantized;
    }

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, {
                quantized: this.quantized,
                progress_callback,
            });
        }

        return this.instance;
    }
}

self.addEventListener("message", async (event) => {
    const message = event.data;
    console.log('received', message)

    let result = await classify(
        message.image,
        message.model,
        message.quantized,
    );
    if (result === null) return;

    // Send the result back to the main thread
    self.postMessage({
        status: "complete",
        task: "image-classification",
        data: result,
    });
});

class ImageClassificationPipelineSingleton extends Singleton {
    static task = "image-classification";
    static model = null;
    static quantized = null;
}

const classify = async (
    image,
    model,
    quantized,
) => {

    const modelName = `Xenova/${model}`;

    const p = ImageClassificationPipelineSingleton;
    if (p.model !== modelName || p.quantized !== quantized) {
        // Invalidate model if different
        p.model = modelName;
        p.quantized = quantized;

        if (p.instance !== null) {
            (await p.getInstance()).dispose();
            p.instance = null;
        }
    }

    // Load classifier model
    let classifier = await p.getInstance((data) => {
        self.postMessage(data);
    });

    // Actually run transcription
    let output = await classifier(image, {
        
    }).catch((error) => {
        self.postMessage({
            status: "error",
            task: "image-classification",
            data: error,
        });
        return null;
    });
    console.log('output', output)

    return output;
};