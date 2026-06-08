import "./HeroSection.css";

import bgImage from "../assets/images/first-background.webp";
import earphoneVideo from "../assets/videos/earphone1.webm";
import BlackLiquid from "./BlackLiquid";

const BLACK_LIQUID_LAYOUT = {
  width: "100%",
  height: "95vh",
  left: 0,
  right: 0,
  bottom: 0,
  top: "auto",
  translateX: "0%",
  translateY: "0%",
  zIndex: 1,
};

function HeroSection() {
  const heroLiquidStyle = {
    position: "absolute",
    width: BLACK_LIQUID_LAYOUT.width,
    height: BLACK_LIQUID_LAYOUT.height,
    left: BLACK_LIQUID_LAYOUT.left,
    right: BLACK_LIQUID_LAYOUT.right,
    top: BLACK_LIQUID_LAYOUT.top,
    bottom: BLACK_LIQUID_LAYOUT.bottom,
    zIndex: BLACK_LIQUID_LAYOUT.zIndex,
    transform: `translate(${BLACK_LIQUID_LAYOUT.translateX}, ${BLACK_LIQUID_LAYOUT.translateY})`,
    pointerEvents: "auto",
  };

  return (
    <section
      className="hero-section"
      style={{
        backgroundImage: `url(${bgImage})`,
      }}
    >
      <div className="hero-liquid" style={heroLiquidStyle}>
        <BlackLiquid />
      </div>

      <div className="video-wrapper">
        <video className="earphone-video" autoPlay muted loop playsInline>
          <source src={earphoneVideo} type="video/webm" />
        </video>
      </div>

      <div className="hero-content">
        <div className="hero-content-inner">
          <h1 className="hero-title">VIEL</h1>

          <div className="hero-boxes">
            <div className="hero-box">
              <h3>Premium Audio</h3>
              <p>
                Experience immersive sound with precision-engineered wireless
                earphones designed for everyday life.
              </p>
            </div>

            <div className="hero-box">
              <h3>Designed for Comfort</h3>
              <p>
                Lightweight, ergonomic, and built for all-day listening with
                crystal clear audio quality.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
