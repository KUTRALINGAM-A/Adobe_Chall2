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

![alt text](https://github.com/KUTRALINGAM-A]/Adobe_Chall2/blob/main/AdobeDocumentManager_img.jpg?raw=true)

- **IdeaCloud.tsx** → Lines **10–11**

![alt text](https://github.com/KUTRALINGAM-A]/Adobe_Chall2/blob/main/IdeaCloud_img.jpg?raw=true)

- **ConnectingDots.tsx** → Lines **11–12**

![alt text](https://github.com/KUTRALINGAM-A]/Adobe_Chall2/blob/main/ConnectingDots_img.jpg?raw=true)

- **GetWhatMatters.tsx** → Lines **35–36**

![alt text](https://github.com/KUTRALINGAM-A]/Adobe_Chall2/blob/main/GetWhatMatters_img.jpg?raw=true)

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
