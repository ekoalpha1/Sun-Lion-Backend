Integration examples for emitting realtime events from your backend

1) Express (Node)

- Import and call `handlePaymentProcessed` from `integrations/expressIntegration.js` inside your payment/webhook route handler.
- Call it without awaiting to keep webhook responses fast.

Example:

```js
import express from 'express'
import { handlePaymentProcessed } from './integrations/expressIntegration.js'

app.post('/webhook/payment', async (req, res) => {
  const { userId, accountId, amount, txId } = req.body
  // process DB writes, business logic, etc.
  // emit events asynchronously
  handlePaymentProcessed({ userId, accountId, amount, txId })
  res.json({ ok: true })
})
```

2) NestJS (TypeScript)

- Inject a service that calls the emitter and call it after your business logic.
- Keep emission asynchronous (don't block controller response).

Example (controller method):

```ts
@Post('webhook/payment')
async handleWebhook(@Body() payload: any) {
  const { userId, accountId, amount, txId } = payload
  // process logic
  this.realtimeService.emitTransaction({ userId, transaction: { id: txId, amount, accountId } })
  return { ok: true }
}
```

3) Serverless / Lambda

- Use the emitter helper to call the realtime internal endpoint from within your function.
- Be mindful of cold-starts and connection limits; keep calls short and idempotent.

Example:

```js
// after handling event
await emitTransaction({ userId, transaction })
```

4) Security & best practices

- Use `INTERNAL_API_KEY` and TLS for the realtime internal endpoints.
- Do not block or await long-running network calls inside webhook handlers; emit asynchronously.
- Implement retry/backoff (the provided `realtimeEmitter` already retries transient errors).
- Consider an event queue (Kafka/Rabbit/Bull) for guaranteed delivery and retries instead of direct HTTP calls for high-criticality flows.

5) Observability

- Log emission successes/failures with correlation ids (e.g., transaction id).
- Track emitter errors via Sentry/Datadog.
