import constants from "./constants";

import { pipeline, env, RawImage } from "@xenova/transformers";

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

    if (message.action === 'load') {
        await ImageClassificationPipelineSingleton.getInstance();
        self.postMessage({ status: "ready" });
        return;
    }

    // Convert RGBA to grayscale, choose based on alpha channel
    const data = new Uint8ClampedArray(message.image.data.length / 4);
    for (let i = 0; i < data.length; ++i) {
        data[i] = message.image.data[i * 4 + 3];
    }
    const img = new RawImage(data, message.image.width, message.image.height, 1);

    let result = await classify(img);
    if (result === null) return;

    // Send the result back to the main thread
    self.postMessage({
        status: "result",
        task: "image-classification",
        data: result,
    });
});

class ImageClassificationPipelineSingleton extends Singleton {
    static task = "image-classification";
    static model = `Xenova/${constants.DEFAULT_MODEL}`;
    static quantized = constants.DEFAULT_QUANTIZED;
}

const classify = async (image) => {

    let classifier = await ImageClassificationPipelineSingleton.getInstance();

    // Actually run classification
    let output = await classifier(image, {
        topk: 0, // Return all classes
    }).catch((error) => {
        self.postMessage({
            status: "error",
            task: "image-classification",
            data: error,
        });
        return null;
    });

    return output;
};