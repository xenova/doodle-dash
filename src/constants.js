export default {
    DEFAULT_MODEL: "quickdraw-mobilevit-small",
    DEFAULT_QUANTIZED: false,
    BANNED_LABELS: [
        // List of banned labels, because they are either:
        // - Too similar to other labels
        // - Too difficult to draw
        // - Too difficult to understand
        'animal migration',
        'stitches',
    ],
    TARGET_FPS: 60,
    GAME_DURATION: 10 + 0.5, // + 0.5 so it doesn't flicker (TODO: change to 60)
    COUNTDOWN_TIMER: 3,
};
