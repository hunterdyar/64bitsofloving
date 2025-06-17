export type Challenge = {
    title: string
    description: string
    maxBytes: number
    maxTokens: number
    textOut: string | undefined
    imageOut: number[]
}