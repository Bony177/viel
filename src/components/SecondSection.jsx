import "./SecondSection.css";

import BlackLiquid from "./BlackLiquid";

import venomVideo from "../assets/videos/venom.webm";
import backgroundBeam from "../assets/videos/background1v.webm";

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

function SecondSection() {
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
    <section className="second-section">
      <div className="second-liquid" style={heroLiquidStyle}>
        <BlackLiquid />
      </div>

      <div className="venom-wrapper">
        <video className="venom-video" autoPlay muted loop playsInline>
          <source src={venomVideo} />
        </video>
      </div>

      <div className="beam-video-wrapper second-beam">
        <video className="beam-video" autoPlay muted loop playsInline>
          <source src={backgroundBeam} type="video/webm" />
        </video>
      </div>
    </section>
  );
}

export default SecondSection;
