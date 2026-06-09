import "./Navbar.css";
export default function Navbar() {
  return (
    <header className="navbar">
      <div className="logo">VIEL</div>

      <nav className="nav-links">
        <a href="#" className="active">
          Home
        </a>

        <a href="#">Products</a>

        <a href="#">Technology</a>

        <a href="#">Experience</a>

        <a href="#">Support</a>
      </nav>

      <div className="nav-right">
        <svg className="cart-icon" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 5H5L7 15H18L20 8H8"
            stroke="currentColor"
            strokeWidth="1.5"
          />

          <circle cx="9" cy="20" r="1" fill="currentColor" />

          <circle cx="18" cy="20" r="1" fill="currentColor" />
        </svg>

        <span>Cart</span>

        <div className="cart-count">0</div>
      </div>
    </header>
  );
}
