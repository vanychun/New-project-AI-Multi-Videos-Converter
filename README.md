# AI Multi Videos Converter

Professional AI-powered multi-video converter with batch processing and enhancement capabilities.

## Features

- 🎥 Multi-format video conversion
- 🤖 AI-powered video enhancement
- 📦 Batch processing capabilities
- ⚡ Fast performance with FFmpeg
- 🎨 Modern React + Electron interface
- 📊 Real-time processing progress
- 🔧 Advanced settings and customization

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vanychun/New-project-AI-Multi-Videos-Converter.git
   cd New-project-AI-Multi-Videos-Converter
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application in development mode:**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm start` - Run the built application
- `npm run dist` - Create distributable packages
- `npm run dist:win` - Create Windows installer
- `npm run dist:mac` - Create macOS installer
- `npm run dist:linux` - Create Linux AppImage
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Usage

1. **Development Mode:**
   ```bash
   npm run dev
   ```
   This starts both the Vite development server and Electron app with hot reload.

2. **Production Build:**
   ```bash
   npm run build
   npm start
   ```

3. **Create Installer:**
   ```bash
   npm run dist
   ```

## Project Structure

```
├── src/                    # React source code
│   ├── components/         # React components
│   ├── services/          # API and service layers
│   ├── store/             # Redux store and slices
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── electron/              # Electron main process
│   ├── main.ts            # Main process entry point
│   └── preload.ts         # Preload script
├── dist/                  # Built files
├── assets/                # Static assets
└── public/                # Public files

```

## System Requirements

- **Windows:** Windows 10 or later
- **macOS:** macOS 10.14 or later
- **Linux:** Ubuntu 18.04 or equivalent
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 2GB free space

## Troubleshooting

### Common Issues

1. **Node.js version error:**
   ```bash
   # Check your Node.js version
   node --version
   # Should be v18 or higher
   ```

2. **npm install fails:**
   ```bash
   # Clear npm cache and try again
   npm cache clean --force
   npm install
   ```

3. **Electron doesn't start:**
   ```bash
   # Rebuild electron dependencies
   npm run postinstall
   ```

4. **FFmpeg not found:**
   - FFmpeg is included as a dependency
   - If issues persist, install FFmpeg system-wide

### Getting Help

- Check the [Issues](https://github.com/vanychun/New-project-AI-Multi-Videos-Converter/issues) page
- Create a new issue with detailed information about your problem

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Powered by [React](https://reactjs.org/)
- Video processing with [FFmpeg](https://ffmpeg.org/)
- UI components with [Framer Motion](https://www.framer.com/motion/)