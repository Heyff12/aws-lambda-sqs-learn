import { SendMessageCommand } from "@aws-sdk/client-sqs"
import { sqsClient } from "./sqsClient"

interface SendMessageParams {
    messageBody: string
}
export const sendMessage = async (payload: SendMessageParams): Promise<void> => {
    const {messageBody} = payload
    const params = {
        QueueUrl: 'https://sqs.us-east-2.amazonaws.com/071139447073/lambdaSqsQueue',
        MessageBody: messageBody
    }
    await sqsClient.send(new SendMessageCommand(params))
}