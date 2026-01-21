export type Challenge = {
    title: string
    description: string
    maxBytes: number
    maxTokens: number
    helpLink: string | undefined
    textOut: string | undefined
    imageOut: number[]
}