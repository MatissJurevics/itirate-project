This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## AI Model Configuration

This project supports both cloud-based AI (Anthropic) and local AI models via LM Studio.

### Using Anthropic (Default)

1. Set your environment variables:
```bash
ANTHROPIC_API_KEY=your_api_key_here
```

### Using LM Studio (Local Models)

1. Download and install [LM Studio](https://lmstudio.ai/)

2. Load a model in LM Studio:
   - Open LM Studio
   - Browse and download a model (e.g., Llama 3.2, Mistral, Phi-3, etc.)
   - Load the model

3. Start the LM Studio server:
   - Click on the "Local Server" tab in LM Studio
   - Click "Start Server" (default port: 1234)
   - Note the model name shown in the server interface

4. Configure your environment variables:
```bash
USE_LMSTUDIO=true
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL_ID=your-model-name
```

5. The chat API will automatically use your local model

### Testing the Chat API

```bash
# Test with Anthropic
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'

# Test with LM Studio (after configuring)
USE_LMSTUDIO=true curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
