import { SendMessageCommand } from "@aws-sdk/client-sqs"
import { sqsClient } from "./sqsClient"

interface SendMessageParams {
    messageBody: string
    queueUrl: string
}
export const sendMessage = async (payload: SendMessageParams): Promise<void> => {
    const {messageBody,queueUrl} = payload
    const params = {
        QueueUrl: queueUrl,
        MessageBody: messageBody
    }
    await sqsClient.send(new SendMessageCommand(params))
}