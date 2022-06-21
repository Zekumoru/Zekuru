type EmojiTable = {
    [key: number]: string
}

export function prepareForTranslation(message: string) {
    const emojiTable: EmojiTable = {}

    const leftBracket = {
        isFound: false,
        lastPosition: 0,
        position: 0
    }

    const translateTextSubstrings = []

    for (let i = 0; i < message.length; i++) {
        if (leftBracket.isFound && message[i] === '>') {
            emojiTable[leftBracket.position] = message.substring(leftBracket.position, Number(i) + 1);
            translateTextSubstrings.push(message.substring(leftBracket.lastPosition, leftBracket.position))
            translateTextSubstrings.push(`<${leftBracket.position}>`)
            leftBracket.lastPosition = leftBracket.position = Number(i) + 1;
            leftBracket.isFound = false;
        }

        if (message[i] === '<') {
            leftBracket.isFound = true;
            leftBracket.position = i;
        }
    }
    translateTextSubstrings.push(message.substring(leftBracket.lastPosition))

    return {
        originalText: message,
        processedText: translateTextSubstrings.join(''),
        emojiTable: emojiTable
    };
}

export function returnEmojisToTranslation(translatedMessage: string, emojiTable: EmojiTable) {
    for (let key in emojiTable) {
        translatedMessage = translatedMessage.replace(`<${key}>`, emojiTable[key]);
    }
    return translatedMessage;
}