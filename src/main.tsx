import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App.tsx';
import reportWebVitals from './reportWebVitals.ts';
import { Wrapper } from './Wrapper.tsx';

// Render the app
const rootElement = document.getElementById('app');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <Wrapper>
        <App />
      </Wrapper>
    </StrictMode>,
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
