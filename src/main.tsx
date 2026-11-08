/**
 * Client Application Entrypoint
 *
 * This module initializes the React 19 application tree, mounts it to the root DOM node,
 * and loads global Tailwind CSS stylesheets.
 *
 * Feature Overview & Use Cases:
 * 1. Root DOM Mounting: Locates the root HTML container element and attaches the Concurrent React renderer.
 * 2. Global Styling Injection: Imports the primary CSS bundle containing Tailwind utilities and base typography.
 */

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { logFunctionCall } from './utils/logger';

/**
 * Boots the client application by mounting the root component into the DOM.
 */
function mountApp(): void {
  logFunctionCall('mountApp', { rootElementFound: Boolean(document.getElementById('root')) });
  const container = document.getElementById('root');
  if (container) {
    createRoot(container).render(<App />);
  }
}

mountApp();
