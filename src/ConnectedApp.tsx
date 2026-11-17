import App from "./App";
import { MusicProvider } from "./store";
export default function ConnectedApp() {
  return (
    <MusicProvider>
      <App />
    </MusicProvider>
  );
}
