# RemoteConnect Pro - Desktop Edition (v7.2.4 Stable)

Secure, high-performance remote desktop management built with React, Vite, and Electron.

## 🔒 Professional Security Suite
*   **Unattended Access**: Configure persistent machine IDs and automatic background hosting.
*   **Session Password**: Integrated security challenge with custom UI modal for remote authentication.
*   **Two-Factor Authentication (2FA)**: Real-time host-side manual approval for incoming connections.
*   **Encrypted Signalling**: P2P handshakes managed via secure Firebase Firestore channels.

## 🚀 Como gerar o Executável (.exe)
...

Este projeto está configurado com **Electron** e **electron-builder** para gerar uma aplicação Windows portátil.

### Pré-requisitos
* [Node.js](https://nodejs.org/) (Versão 18 ou superior)
* npm (incluído no Node.js)

### Passos para Compilar
1.  **Clone o repositório:**
    ```bash
    git clone <url-do-seu-repositorio>
    cd remote-connect-desktop
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```
3.  **Gere o executável:**
    ```bash
    npm run electron:build
    ```

O ficheiro `.exe` será gerado na pasta `dist-electron/RemoteConnect Pro.exe`.

## 🛠️ Tecnologias Utilizadas
* **Frontend:** React + Tailwind CSS + Lucide Icons
* **Desktop:** Electron
* **Base de Dados/Sinalização:** Firebase Firestore (WebRTC Signaling)
* **P2P:** WebRTC para transmissão de ecrã ultra-rápida.

## 🔒 Segurança
* Ligação P2P encriptada.
* Suporte para "Unattended Access" (Acesso Não Supervisionado).
* IPs e sinalização protegidos via Firebase.
