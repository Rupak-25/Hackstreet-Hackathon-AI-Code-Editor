# Hackstreet Hackathon AI Code Editor

> A modern, VS Code-inspired AI-powered code editor interface built with cutting-edge web technologies.

## 🎯 Overview

**AI Code Studio** is a frontend-only, feature-rich code editor interface that brings the professional development experience of VS Code to the browser. Powered by Gemini AI, it offers real-time code editing, intelligent assistance, and a beautiful, responsive IDE-like interface.

Built for the Hackstreet Hackathon with ❤️

## ✨ Features

### Core Editing
- 📝 **Real-time Code Editor** - Syntax highlighting and editing powered by CodeMirror
- 📑 **Multi-tab Interface** - Edit multiple files simultaneously with persistent tabs
- 🗂️ **File Explorer** - Nested directory structure with drag-and-drop file movement
- 💾 **Persistent Workspace** - LocalStorage-based state management

### Advanced Features
- 🤖 **AI Chat Assistant** - Powered by Gemini API with streaming markdown responses
- 🎨 **Theme Support** - 6 built-in themes: Dark, Light, Dracula, Ocean, Forest, High Contrast
- ⌨️ **IDE Shortcuts** - 17+ keyboard shortcuts mirroring VS Code
- 🔍 **Search & Navigation** - Command Palette, Quick Open, and global search
- 📱 **Responsive Layout** - Resizable panels and adaptive design
- 🎮 **Mock Terminal** - Simulated run button with output console
- 🎯 **Cursor Persistence** - Automatic cursor and scroll position restoration per file

### UI/UX
- Source Control panel
- Debug panel
- Extensions marketplace
- Toggle sidebar and console
- Word wrap support
- Zoom controls

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React** | UI Framework |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Styling |
| **CodeMirror** | Code editor |
| **Gemini API** | AI assistance |
| **React Markdown** | Markdown rendering |
| **Lucide React** | Icons |
| **LocalStorage** | State persistence |

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rupak-25/Hackstreet-Hackathon-AI-Code-Editor.git
   cd Hackstreet-Hackathon-AI-Code-Editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GEMINI_MODEL=gemini-2.5-flash
   ```

   Ensure `.env.local` is in `.gitignore`:
   ```
   .env
   .env.local
   .env.*.local
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173/
   ```

## 📦 Production Build

Build for production:
```bash
npm run build
```

The optimized files will be generated in the `dist/` folder.

Deploy the contents of the `dist/` folder to your hosting provider.

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Run Current File | `Ctrl` + `Enter` |
| Command Palette | `Ctrl` + `Shift` + `P` |
| Quick Open | `Ctrl` + `P` |
| Show Explorer | `Ctrl` + `Shift` + `E` |
| Show Search | `Ctrl` + `Shift` + `F` |
| Show Source Control | `Ctrl` + `Shift` + `G` |
| Show Debug | `Ctrl` + `Shift` + `D` |
| Show Extensions | `Ctrl` + `Shift` + `X` |
| Toggle Sidebar | `Ctrl` + `B` |
| Toggle Console | `Ctrl` + `J` |
| Save Workspace | `Ctrl` + `S` |
| Focus AI Chat | `Ctrl` + `I` |
| Close Tab | `Ctrl` + `W` |
| Rename File | `F2` |
| Word Wrap | `Alt` + `Z` |
| Zoom In | `Ctrl` + `+` |
| Zoom Out | `Ctrl` + `-` |
| Refresh Workspace | `Ctrl` + `R` |

## 🎨 Available Themes

Choose from 6 carefully crafted themes:

- **Dark** - Classic dark theme for reduced eye strain
- **Light** - Clean, bright interface for daytime coding
- **Dracula** - Popular dark theme with vibrant colors
- **Ocean** - Cool blues and greens
- **Forest** - Nature-inspired green tones
- **High Contrast** - Accessible theme for better visibility

## 🏗️ Project Structure

```
src/
├── components/      # React components
├── pages/          # Page layouts
├── styles/         # Tailwind & custom CSS
├── utils/          # Helper functions
├── hooks/          # Custom React hooks
└── App.jsx         # Main app component
```

## 🔐 Security Note

> ⚠️ **Important:** This is a frontend-only project. The Gemini API key will be exposed in the browser build. For production use, consider implementing a secure backend proxy to handle API calls and protect your credentials.

### Recommendations for Production:
1. Create a backend service to handle Gemini API calls
2. Implement proper authentication
3. Use environment variables on the server side
4. Implement rate limiting and request validation

## 🎯 Hackathon Challenge

This project was created to solve a hackathon problem statement focused on designing and developing a highly interactive frontend interface for an AI-powered code editor. The objective was to replicate the professional experience of VS Code while maintaining a frontend-only architecture.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Author

Created by [**Rupak Chakraborty**](https://www.linkedin.com/in/rupakch16) for Hackstreet Hackathon

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues, questions, or suggestions, please open an issue on the [GitHub repository](https://github.com/Rupak-25/Hackstreet-Hackathon-AI-Code-Editor/issues).

---

**Made with ❤️ by [**Rupak Chakraborty**](https://www.linkedin.com/in/rupakch16)**
