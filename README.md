# 📄 PDF Summarizer Website

An AI-powered platform to summarize, analyze, and extract insights from PDF documents.

The website includes **four main modules** – `Documents`, `IdeaCloud`, `GetWhatMatters`, and `ConnectionDots` – each designed to make working with PDFs easier and more interactive.

---

## 🤖 Powered by Gemini API

This project uses **Google Gemini API** for:

- **LLM (Large Language Model):** Summarization, Q&A with PDFs, idea generation, extracting relevant info.
- **TTS (Text-to-Speech):** Audio overview of documents and insights.

---

## 🚀 Features

### 1. **Documents**

- First page, mainly used for studying.
- Provides **translations, summaries, and chat-based interactions** with PDFs.
- Supports uploading **multiple read/unread PDFs**.
- Selecting a PDF allows access to the **Chat Assistant** (top-right corner) for asking questions directly about the document.

---

### 2. **IdeaCloud**

- "Where ideas come to life."
- Generates **flowcharts and visual canvases** from ideas inside the PDF.
- AI can **suggest flowcharts from PDFs** or let you **create and edit your own canvas**.

---

### 3. **GetWhatMatters**

- Helps extract **only the relevant information** from multiple PDFs.
- Example: From 3 travel documents, it can generate only the details you actually need, removing noise.
- User can define **role** and **specific needs**, then the app generates a **detailed custom output**.
- Currently supports **3 PDFs at once**.

---

### 4. **ConnectionDots**

- Finds and connects **relevant sections** across documents.
- Provides **insights and an audio overview**.
- Workflow:
    1. Open a PDF → visible in the left-side section.
    2. Select text → click **Generate** → relevant sections appear on the right.
    3. Click **Analyse All** → AI provides deep insights + **audio summary**.

---

## 🐞 Known Bugs & Limitations

- Maximum **5 MB PDF support**.
- Navigating to another page may break existing PDF session → requires **reset & reupload**.
- PDFs uploaded on `Documents/IdeaCloud` don’t work if navigated to `GetWhatMatters/ConnectionDots`.
- Chat button in `Documents` & `IdeaCloud` works **only after opening a PDF**.
- Limited to **3 PDFs in GetWhatMatters**.
- APIs are configurable via source code (see below).

---

## ⚙️ API Configuration

Update API keys/endpoints at the following lines:

- **AdobeDocumentManager.tsx** → Line **79**

![WhatsApp Image 2025-08-19 at 18.29.31.jpeg](attachment:80f1047d-fe70-4866-be94-43bd4897f65d:WhatsApp_Image_2025-08-19_at_18.29.31.jpeg)

- **IdeaCloud.tsx** → Lines **10–11**

![WhatsApp Image 2025-08-19 at 18.29.32.jpeg](attachment:1c8c42c2-35ca-47e1-80a9-4826989befe4:WhatsApp_Image_2025-08-19_at_18.29.32.jpeg)

- **ConnectingDots.tsx** → Lines **11–12**

![WhatsApp Image 2025-08-19 at 18.30.40.jpeg](attachment:136733dd-c3fd-4f1a-805f-6c013aa71401:WhatsApp_Image_2025-08-19_at_18.30.40.jpeg)

- **GetWhatMatters.tsx** → Lines **35–36**

![WhatsApp Image 2025-08-19 at 18.31.51.jpeg](attachment:d1a3d66c-b03b-4bbf-9210-8768188345cf:WhatsApp_Image_2025-08-19_at_18.31.51.jpeg)

(Reference images)

---

## 🐳 Deployment with Docker

### 1. Clone the repository

```bash
git clone https://github.com/KUTRALINGAM-A/Adobe_Chall2.git
cd Adobe_Chall2
```

### 2. Start Docker (Windows users → run Docker Desktop in background)

### 3. Build Docker image

```bash
docker build -t my_app .
```

### 4. Verify image

```bash
docker images
```

### 5. Run container

```bash
docker run -p 3000:3000 my_app
```

Your app will now be available at:

👉 `http://localhost:3000`

---

## 📹 Reference Video

A detailed walkthrough is available here:

https://drive.google.com/drive/folders/1J3cY_zJlYqvALYf_nEqoyG3wRUha1mJQ?usp=sharing

---

## 📌 Notes

- Project currently supports **limited PDFs and features** but is extendable.
- APIs are open and can be replaced/modified in the given files.
- Future improvements include **persistent PDF sessions** across pages and **support for larger files**.

---

✨ Built with **React, TailwindCSS, and AI integrations** to make studying and research faster, smarter, and easier.
