# Vertex AI Studio Frontend App with Node.js Backend

This repository contains a frontend and a Node.js backend, designed to run together.
The backend acts as a proxy, handling Google Cloud API calls.

This project is intended for demonstration and prototyping purposes only.
It is not intended for use in a production environment.

See [docs/architecture.md](docs/architecture.md) for the verified deployment status,
security findings, target voice architecture, and production release gates.

## Selected voice channels

The target AI Telesales Inbound system has two channels: phone calls to Twilio
`+1 831 298 8954`, and browser WebRTC at
`https://711shopping.com/chatandshop` using the Twilio Voice JavaScript SDK.
The URL is user-designated but its availability has not been verified. Both
channels are planned to share the Twilio gateway and AI/order services. The
PSTN number still uses its existing webhook; the gateway and browser WebRTC
client/token route are not deployed/implemented. No provider routing was
changed by this repository update. Legacy NT/T30 prototype files are not
deployment instructions.

## Required account separation

- **Google Cloud:** Use `smpmfast@gmail.com` for project `gen-lang-client-0845508747` and its GCP resources.
- **Twilio:** Use `csdeebuddy@gmail.com` for Twilio Console and Twilio resources.
- Verify the active account before inspecting or changing resources. Do not use one provider's account for the other provider.

## Prerequisites

To run this application locally, you need:

*   **[Google Cloud SDK / gcloud CLI](https://cloud.google.com/sdk/docs/install)**: Follow the instructions to install the SDK.

*   **gcloud Initialization**:
    *   Initialize the gcloud CLI:
        ```bash
        gcloud init
        ```
    *   Authenticate for Application Default Credentials (needed to call Google Cloud APIs):
        ```bash
        gcloud auth application-default login
        ```

*   **Node.js and npm**: Ensure you have Node.js and its package manager, `npm`, installed on your machine.

## Project Structure

The project is organized into two main directories:

*   `frontend/`: Contains the Frontend application code.
*   `backend/`: Contains the Node.js/Express server code to proxy Google Cloud API calls.
* `backend/voice-adapter/`: IAP-protected WebSocket adapter for Vertex AI Live.
* `backend/twilio-voice-gateway/`: Not-yet-deployed Twilio Programmable Voice ingress; WebRTC TwiML/token routes are not implemented.

## Backend Environment Variables

The `backend/.env.local` file is automatically generated when you download this application.
It contains essential Google Cloud environment variables pre-configured based on your project settings at the time of download.

The variables set in `backend/.env.local` are:
*   `API_BACKEND_PORT`: The port the backend API server listens on (e.g., `5000`).
*   `API_PAYLOAD_MAX_SIZE`: The maximum size of the request payload accepted by the backend server (e.g., `5mb`).
*   `GOOGLE_CLOUD_LOCATION`: The Google Cloud region associated with your project.
*   `GOOGLE_CLOUD_PROJECT`: Your Google Cloud Project ID.

**Note:** These variables are automatically populated during the download process.
You can modify the values in `backend/.env.local` if you need to change them.

## Installation and Running the App

To install dependencies and run your Google Cloud Vertex AI Studio App locally, execute the following command:

```bash
npm install && npm run dev
