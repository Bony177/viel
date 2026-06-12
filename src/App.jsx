import HeroSection from "./components/HeroSection";
import SecondSection from "./components/SecondSection";
import fogVideo from "./assets/videos/fog.webm";
import "./styles/FogBridge.css";

function App() {
  return (
    <div style={{ position: "relative" }}>
      <HeroSection />
      {/* Fog Transition Bridge Between Sections */}
      <div className="fog-bridge">
        <video className="fog-bridge-video" autoPlay muted loop playsInline>
          <source src={fogVideo} type="video/webm" />
        </video>
      </div>
      <SecondSection />
    </div>
  );
}

export default App;
