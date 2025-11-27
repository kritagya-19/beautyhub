import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css'; 
import { 
  Menu, X, ShoppingBag, Star, ArrowRight, Play, 
  CheckCircle, Instagram, Youtube, Twitter, Heart, Sparkles, Quote 
} from 'lucide-react';

// --- Utility Components & Hooks ---

const useOnScreen = (options) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [ref, options]);

  return [ref, isVisible];
};

const FadeIn = ({ children, delay = 0, className = "" }) => {
  const [ref, isVisible] = useOnScreen({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// --- 3D Lipstick Component ---
const Lipstick3D = () => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let camera, scene, renderer, lipstickGroup;
    let animationId;
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    // Load Three.js dynamically
    const loadThree = () => {
      return new Promise((resolve, reject) => {
        if (window.THREE) {
          resolve(window.THREE);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => resolve(window.THREE);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const init = async () => {
      const THREE = await loadThree();
      setLoading(false);

      if (!containerRef.current) return;

      // Scene Setup
      scene = new THREE.Scene();
      // Transparent background to blend with the gradient
      scene.background = null; 

      // Camera
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.z = 11;
      camera.position.y = 0.5;

      // Renderer
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      containerRef.current.appendChild(renderer.domElement);

      // --- Texture Generation for Realism ---
      const getWaxTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,512,512);
        
        // Add subtle noise
        for (let i = 0; i < 100000; i++) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 512, Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
      };

      // --- Build Lipstick Model ---
      lipstickGroup = new THREE.Group();

      // 1. Base Case (Premium Rose Gold with Clearcoat)
      const baseGeo = new THREE.CylinderGeometry(1.2, 1.2, 3, 64);
      const roseGoldMat = new THREE.MeshPhysicalMaterial({ 
        color: 0xE6C6C0, // Rose Gold
        metalness: 0.6,
        roughness: 0.25,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        reflectivity: 1.0
      });
      const baseMesh = new THREE.Mesh(baseGeo, roseGoldMat);
      baseMesh.position.y = -1.5;
      lipstickGroup.add(baseMesh);

      // 2. Middle Ring (High Polish Gold)
      const ringGeo = new THREE.CylinderGeometry(1.12, 1.12, 0.25, 64);
      const goldMat = new THREE.MeshPhysicalMaterial({ 
        color: 0xFFD700, 
        metalness: 1.0, 
        roughness: 0.15,
        clearcoat: 1.0
      });
      const ringMesh = new THREE.Mesh(ringGeo, goldMat);
      ringMesh.position.y = 0.1;
      lipstickGroup.add(ringMesh);

      // 3. Inner Tube (Chrome)
      const innerGeo = new THREE.CylinderGeometry(0.95, 0.95, 1.5, 64);
      const silverMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        metalness: 0.9, 
        roughness: 0.2 
      });
      const innerMesh = new THREE.Mesh(innerGeo, silverMat);
      innerMesh.position.y = 0.9;
      lipstickGroup.add(innerMesh);

      // 4. The Lipstick (Textured Waxy Finish)
      const stickGeo = new THREE.CylinderGeometry(0.85, 0.85, 2.6, 64);
      
      // Slant the tip manually
      const posAttribute = stickGeo.attributes.position;
      const vertex = new THREE.Vector3();
      for (let i = 0; i < posAttribute.count; i++) {
        vertex.fromBufferAttribute(posAttribute, i);
        if (vertex.y > 0) { 
          // Smoother slant curve
          const slant = (vertex.x + 0.85) * 0.9;
          vertex.y -= slant;
          // Add slight curvature to the tip surface
          if (vertex.y > 0.5) {
             vertex.y -= Math.pow(vertex.z, 2) * 0.1; 
          }
        }
        posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      stickGeo.computeVertexNormals();

      const waxTexture = getWaxTexture();
      const stickMat = new THREE.MeshStandardMaterial({ 
        color: 0xFB6F92, 
        metalness: 0.0,
        roughness: 0.45, // Waxy roughness
        bumpMap: waxTexture,
        bumpScale: 0.015, // Subtle texture depth
      });
      const stickMesh = new THREE.Mesh(stickGeo, stickMat);
      stickMesh.position.y = 2.1;
      lipstickGroup.add(stickMesh);

      // Initial tilt
      lipstickGroup.rotation.z = 0.15;
      lipstickGroup.rotation.x = 0.1;
      
      scene.add(lipstickGroup);

      // --- Studio Lighting Setup ---
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      // Key Light (Spot)
      const spotLight = new THREE.SpotLight(0xffffff, 2);
      spotLight.position.set(5, 8, 8);
      spotLight.angle = Math.PI / 6;
      spotLight.penumbra = 0.2;
      spotLight.decay = 2;
      spotLight.distance = 50;
      scene.add(spotLight);

      // Fill Light (Soft Pink)
      const fillLight = new THREE.PointLight(0xFFC0CB, 0.8); 
      fillLight.position.set(-6, 2, 6);
      scene.add(fillLight);

      // Rim Light (Cool Blue-ish for contrast)
      const rimLight = new THREE.DirectionalLight(0xeef2ff, 1);
      rimLight.position.set(0, 5, -5);
      scene.add(rimLight);

      // --- Animation ---
      const animate = () => {
        animationId = requestAnimationFrame(animate);

        if (lipstickGroup) {
          // Elegant slow rotation
          lipstickGroup.rotation.y += 0.004;

          // Interactive parallax
          const targetX = mouseY * 0.3;
          const targetY = mouseX * 0.3;
          
          lipstickGroup.rotation.x += (targetX - lipstickGroup.rotation.x) * 0.05;
          lipstickGroup.rotation.z += (targetY + 0.15 - lipstickGroup.rotation.z) * 0.05;
          
          // Gentle floating
          lipstickGroup.position.y = Math.sin(Date.now() * 0.0015) * 0.15;
        }

        renderer.render(scene, camera);
      };
      animate();

      // --- Event Listeners ---
      const handleMouseMove = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      };

      const handleResize = () => {
        if (!containerRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);
      containerRef.current.addEventListener('mousemove', handleMouseMove);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        if (containerRef.current) {
          containerRef.current.removeEventListener('mousemove', handleMouseMove);
          containerRef.current.removeChild(renderer.domElement);
        }
        cancelAnimationFrame(animationId);
      };
    };

    init();
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="text-rose-400 animate-spin" size={32} />
        </div>
      )}
      
      {/* 3D Container */}
      <div ref={containerRef} className="w-full h-[500px] md:h-[700px] cursor-move" />
      
      {/* Decorative elements behind 3D model */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-rose-400/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
    </div>
  );
};

// Premium Button Component
const Button = ({ children, variant = "primary", className = "", icon: Icon }) => {
  const baseStyle = "px-8 py-3 rounded-full font-medium transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-rose-900 text-white shadow-xl hover:bg-rose-800 hover:shadow-rose-900/20",
    secondary: "bg-white text-rose-900 border border-gray-200 hover:border-rose-200 hover:bg-rose-50",
    outline: "border-2 border-white text-white hover:bg-white hover:text-rose-500"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
      {Icon && <Icon size={18} />}
    </button>
  );
};

// --- Main Application Component ---

export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle Scroll Effect for Navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  const brands = ['VOGUE', 'ELLE', 'Cosmopolitan', 'Marie Claire', 'Glamour', 'Harper\'s BAZAAR', 'Allure'];

  // Expanded reviews data for the marquee
  const reviews = [
    {
      text: "I've finally found a brand that understands my skin! The lip tint is literally perfect for college.",
      name: "Priya K.",
      loc: "New Delhi",
      img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto=format&fit=crop"
    },
    {
      text: "Beautyhub is an obsession. The packaging is so aesthetic I keep it on my desk.",
      name: "Sarah M.",
      loc: "Mumbai",
      img: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1964&auto=format&fit=crop"
    },
    {
      text: "Fast delivery and the products smell amazing. It feels premium but accessible.",
      name: "Ananya S.",
      loc: "Bangalore",
      img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1887&auto=format&fit=crop"
    },
    {
      text: "The serum changed my texture in a week. Glow game is strong!",
      name: "Riya P.",
      loc: "Pune",
      img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1887&auto=format&fit=crop"
    },
    {
      text: "I love the sustainability focus. Finally a brand that cares.",
      name: "Meera J.",
      loc: "Jaipur",
      img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop"
    },
    {
      text: "Best highlighter hands down. It looks so natural in sunlight.",
      name: "Kavya L.",
      loc: "Chennai",
      img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=1887&auto=format&fit=crop"
    }
  ];

  return (
    <div className="font-sans text-slate-800 bg-rose-50/30 min-h-screen overflow-x-hidden selection:bg-rose-200 selection:text-rose-900">
      {/* Inject Fonts and Custom Animations directly */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
        
        .blob-1 { background: radial-gradient(circle, #ffe4e6 0%, transparent 70%); }
        .blob-2 { background: radial-gradient(circle, #fbcfe8 0%, transparent 70%); }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }

        /* Marquee Animation */
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee-reverse {
          animation: marquee-reverse 45s linear infinite;
        }
        .animate-marquee:hover, .animate-marquee-reverse:hover {
          animation-play-state: paused;
        }
        
        /* Hide scrollbar for cleaner look */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Modern Premium "Floating Island" Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-500 ease-in-out ${isScrolled ? 'pt-2' : 'pt-6'}`}>
        <div 
          className={`
            relative flex items-center justify-between
            transition-all duration-500 ease-in-out
            backdrop-blur-xl border border-white/50 shadow-lg shadow-rose-900/5
            ${isScrolled 
              ? 'w-[98%] max-w-7xl rounded-2xl bg-white/90 py-3 px-6' 
              : 'w-[92%] max-w-5xl rounded-full bg-white/70 py-4 px-8'
            }
          `}
        >
          {/* Logo Section */}
          <div className="flex items-center gap-3 cursor-pointer group">
             <div className="relative">
                <div className="absolute inset-0 bg-rose-300 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-rose-100 to-white flex items-center justify-center text-rose-600 border border-white shadow-sm">
                  <Sparkles size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                </div>
             </div>
             <span className="font-serif text-2xl font-bold tracking-tight text-slate-900">
               Beautyhub.
             </span>
          </div>

          {/* Desktop Links (Centered with Modern Slide-Up Hover) */}
          <div className="hidden md:flex items-center gap-2">
            {['Home', 'Our Story', 'Collections', 'Reviews'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(' ', '-')}`} 
                className="relative px-5 py-2.5 rounded-full group overflow-hidden"
              >
                {/* Hover Background Animation */}
                <span className="absolute inset-0 bg-rose-100/80 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-full"></span>
                
                {/* Text Content */}
                <span className="relative z-10 text-sm font-bold text-slate-600 group-hover:text-rose-900 tracking-wide uppercase transition-colors duration-300">
                  {item}
                </span>
              </a>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
             <button className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-rose-600 transition-all shadow-lg hover:shadow-rose-500/30 group">
                <ShoppingBag size={16} /> 
                <span>Shop</span>
             </button>

             {/* Mobile Toggle */}
             <button 
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-white border border-rose-100 text-slate-800 shadow-sm hover:bg-rose-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(true)}
             >
                <Menu size={20} />
             </button>
          </div>
        </div>
      </nav>

      {/* Full Screen Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 z-[60] bg-white/95 backdrop-blur-2xl transition-transform duration-500 ease-in-out flex flex-col ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex justify-between items-center p-8">
           <span className="font-serif text-2xl font-bold text-slate-900">Beautyhub.</span>
           <button 
             onClick={() => setIsMobileMenuOpen(false)}
             className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-slate-900 hover:bg-rose-100 transition-colors"
           >
             <X size={24} />
           </button>
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center gap-8">
           {['Home', 'Our Story', 'Collections', 'Reviews'].map((item, i) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="font-serif text-4xl md:text-5xl font-bold text-slate-900 hover:text-rose-600 transition-colors relative group"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                {item}
                <span className="absolute -bottom-2 left-0 w-0 h-1 bg-rose-300 group-hover:w-full transition-all duration-300"></span>
              </a>
           ))}
        </div>

        <div className="p-8 pb-12">
           <button className="w-full py-5 bg-slate-900 text-white text-lg font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3">
             <ShoppingBag /> Go to Shop
           </button>
        </div>
      </div>

      {/* Hero Section */}
      <section id="home" className="relative pt-32 lg:pt-40 pb-20 overflow-hidden min-h-screen flex items-center">
        {/* Background Blobs */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] blob-1 opacity-50 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] blob-2 opacity-50 translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            {/* Hero Text */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <FadeIn>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-widest mb-6 border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  New Generation Beauty
                </div>
              </FadeIn>
              
              <FadeIn delay={100}>
                <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.1] text-slate-900 mb-8">
                  Glow Like You <br />
                  <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-600 pr-2">
                    Mean It.
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={200}>
                <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
                  Clean ingredients, premium formulas, and a vibe that matches yours. Beautyhub is designed for the modern girl who runs the world.
                </p>
              </FadeIn>

              <FadeIn delay={300}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button variant="primary" icon={ArrowRight}>Explore Collection</Button>
                  <Button variant="secondary" icon={Play}>Our Story</Button>
                </div>
              </FadeIn>

              <FadeIn delay={400}>
                <div className="mt-12 flex flex-wrap justify-center lg:justify-start gap-8 text-sm font-medium text-slate-500">
                  {['Vegan', 'Cruelty-Free', 'Dermatologist Tested'].map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-rose-500" />
                      {feature}
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>

            {/* Hero Image Replaced with 3D Model */}
            <div className="relative order-1 lg:order-2 flex justify-center items-center min-h-[500px]">
              <FadeIn delay={200} className="relative w-full h-full flex items-center justify-center">
                <Lipstick3D />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof with Marquee - REDESIGNED */}
      <div className="bg-rose-950 py-16 border-y border-rose-900 overflow-hidden relative">
        {/* Deep Gradient Masks */}
        <div className="absolute inset-y-0 left-0 w-32 md:w-60 bg-gradient-to-r from-rose-950 to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-32 md:w-60 bg-gradient-to-l from-rose-950 to-transparent z-10"></div>
        
        <div className="max-w-none">
          <p className="text-center text-xs font-bold tracking-[0.3em] text-rose-200/50 uppercase mb-12">Featured In Top Beauty Editorials</p>
          
          <div className="flex w-max animate-marquee gap-16 md:gap-32 items-center group">
            {/* Repeated 3 times for extra smooth infinite scroll on wide screens */}
            {[...brands, ...brands, ...brands].map((brand, i) => (
              <div key={i} className="flex items-center gap-16 md:gap-32">
                <h3 className="font-serif text-4xl md:text-6xl font-bold text-rose-200/30 hover:text-white transition-all duration-500 cursor-default whitespace-nowrap tracking-tight hover:scale-105 transform hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                  {brand}
                </h3>
                {/* Separator */}
                <Sparkles className="text-rose-500/30 w-6 h-6 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modern Premium About Section (Redesigned - Trendy Editorial) */}
      <section id="our-story" className="py-32 relative overflow-hidden bg-stone-50">
        {/* Animated Background Text */}
        <div className="absolute top-20 -left-20 whitespace-nowrap opacity-[0.03] pointer-events-none select-none overflow-hidden w-full">
          <span className="text-[8rem] md:text-[12rem] font-serif font-bold animate-marquee inline-block">BEAUTY REIMAGINED BEAUTY REIMAGINED</span>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-center">
            
            {/* Left: Visual Composition (Collage) */}
            <div className="w-full lg:w-1/2 relative">
              <FadeIn>
                <div className="relative group perspective-1000">
                   {/* Main Portrait */}
                   <div className="relative z-20 w-[85%] aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white transition-transform duration-700 group-hover:rotate-1 group-hover:scale-[1.02]">
                     <img 
                       src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1888&auto=format&fit=crop" 
                       alt="Founder Chhavi Sharma" 
                       className="w-full h-full object-cover"
                     />
                     {/* Gradient Overlay */}
                     <div className="absolute inset-0 bg-gradient-to-t from-rose-900/20 to-transparent mix-blend-overlay" />
                   </div>

                   {/* Secondary Texture Image (Behind) */}
                   <div className="absolute top-12 -right-4 lg:-right-8 w-2/3 aspect-square rounded-[2.5rem] overflow-hidden shadow-lg z-10 rotate-6 opacity-90 transition-transform duration-700 group-hover:rotate-12 group-hover:translate-x-4 border-4 border-white">
                      <img 
                        src="https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1887&auto=format&fit=crop" 
                        alt="Aesthetic Detail" 
                        className="w-full h-full object-cover"
                      />
                   </div>

                   {/* Floating "Note" Glass Card */}
                   <div className="absolute bottom-20 -left-4 lg:-left-12 z-30 bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/60 max-w-[240px] animate-float">
                      <Quote className="text-rose-400 w-8 h-8 mb-3 fill-rose-100" />
                      <p className="font-serif text-lg italic leading-snug text-slate-800">"Beauty is your personal signature. Wear it loud."</p>
                   </div>
                </div>
              </FadeIn>
            </div>

            {/* Right: Editorial Content */}
            <div className="w-full lg:w-1/2 lg:pl-8">
              <FadeIn delay={200}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-12 bg-rose-400"></div>
                  <span className="text-rose-500 font-bold tracking-widest text-xs uppercase">The Origin Story</span>
                </div>
                
                <h2 className="font-serif text-5xl lg:text-7xl font-bold text-slate-900 mb-8 leading-[0.95]">
                  Not Just Another <br/>
                  <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-500">Beauty Brand.</span>
                </h2>

                <div className="space-y-6 text-slate-600 text-lg leading-relaxed font-light mb-10">
                  <p className="first-letter:text-5xl first-letter:font-serif first-letter:text-slate-900 first-letter:float-left first-letter:mr-3 first-letter:mt-[-6px]">
                    It started with a simple frustration. Beauty felt complicated, heavy, and exclusive. I wanted to create something that felt like <strong>freedom</strong>.
                  </p>
                  <p>
                    Beautyhub was born in 2024 with a mission to strip back the excess and focus on what matters: high-performance formulas, clean ingredients, and an aesthetic that sparks joy every time you open your bag.
                  </p>
                </div>

                {/* Interactive Founder Block */}
                <div className="relative p-6 bg-white rounded-3xl shadow-sm border border-rose-50 hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default group">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-rose-100 p-1">
                       <img src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=2071&auto=format&fit=crop" alt="Chhavi" className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-serif text-xl font-bold text-slate-900">Chhavi Sharma</p>
                      <p className="text-xs text-rose-400 font-bold uppercase tracking-wide">Founder & CEO</p>
                    </div>
                    {/* Simulated Signature */}
                    <div className="hidden sm:block font-serif italic text-3xl text-slate-200 rotate-[-5deg] pr-4">Chhavi.S</div>
                  </div>
                </div>

                {/* Stats / Values Row */}
                <div className="grid grid-cols-3 gap-4 mt-10 border-t border-rose-900/5 pt-8">
                   {[
                     { num: "100%", label: "Vegan" },
                     { num: "0%", label: "Toxins" },
                     { num: "24/7", label: "Glow" }
                   ].map((stat, i) => (
                     <div key={i} className="text-center sm:text-left">
                       <p className="font-serif text-2xl md:text-3xl font-bold text-slate-900">{stat.num}</p>
                       <p className="text-[0.65rem] md:text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">{stat.label}</p>
                     </div>
                   ))}
                </div>
              </FadeIn>
            </div>

          </div>
        </div>
      </section>

      {/* Collections / What We Do */}
      <section id="collections" className="py-24 bg-rose-50/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <FadeIn>
              <span className="text-rose-500 font-bold tracking-widest text-sm uppercase mb-4 block">Shop The Edit</span>
              <h2 className="font-serif text-5xl md:text-6xl font-bold text-slate-900 leading-none">
                Curated <br />
                <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-400">Collections</span>
              </h2>
            </FadeIn>
            
            <FadeIn delay={100} className="md:text-right max-w-sm">
              <p className="text-slate-500 text-lg leading-relaxed mb-6">
                Essentials designed for the modern muse. Clean formulas, high impact, and effortlessly cool packaging.
              </p>
              <a href="#" className="inline-flex items-center gap-2 text-rose-600 font-bold hover:gap-4 transition-all group">
                View All Categories <ArrowRight size={18} />
              </a>
            </FadeIn>
          </div>

          {/* Cinematic Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[600px]">
            {[
              {
                title: "Glow Makeup",
                desc: "Lightweight tints & glossy finishes for that golden hour look.",
                img: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=1035&auto=format&fit=crop",
                delay: 0,
                isBranded: false
              },
              {
                title: "Clean Skincare",
                desc: "Hydration powered by superfoods to keep you dewy all day.",
                // Switched to a reliable, high-quality cream jar image
                img: "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=1780&auto=format&fit=crop",
                delay: 150,
                isBranded: false, // Box removed
                productName: "Hydra Cream",
                ingredients: "Peptides + Squalane",
                volume: "50ML / 1.7 FL OZ"
              },
              {
                title: "Self-Care Tools",
                desc: "Jade rollers and silk essentials for your Sunday reset rituals.",
                img: "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?q=80&w=1887&auto=format&fit=crop",
                delay: 300,
                isBranded: false
              }
            ].map((item, index) => (
              <FadeIn key={index} delay={item.delay} className="h-[500px] md:h-full w-full">
                <div className="group relative h-full w-full rounded-[2.5rem] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-500">
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    <img 
                      src={item.img} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110" 
                    />
                    
                    {/* Realistic Product Label Overlay - Only renders if isBranded is true */}
                    {item.isBranded && (
                      <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[100px] bg-[#fffcf7]/95 backdrop-blur-sm shadow-lg flex flex-col items-center justify-center text-center z-10 px-3 rotate-[-1deg] group-hover:rotate-0 transition-transform duration-700 ease-out border border-stone-200/50 rounded-[4px]">
                        {/* Label Content */}
                        <div className="w-full border-b border-stone-200 mb-2 pb-1">
                           <span className="font-serif text-lg font-bold tracking-tighter text-slate-900 block">
                             Beautyhub.
                           </span>
                        </div>
                        <span className="text-[0.5rem] uppercase tracking-[0.2em] text-rose-900 font-bold block mb-1">
                          {item.productName}
                        </span>
                        <span className="text-[0.45rem] text-slate-500 font-serif italic mb-2">
                          {item.ingredients}
                        </span>
                        <div className="mt-auto mb-1 text-[0.35rem] text-slate-400 tracking-widest font-mono">
                          {item.volume}
                        </div>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  </div>

                  {/* Content Overlay - Glass Card */}
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-serif text-2xl md:text-3xl font-bold text-white">{item.title}</h3>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                          <ArrowRight size={18} className="-rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                        </div>
                      </div>
                      <div className="h-0 group-hover:h-auto overflow-hidden transition-all duration-500">
                        <p className="text-rose-100 text-sm md:text-base font-medium pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Parallax - Fixed Background Image */}
      <section className="py-32 relative bg-slate-900 text-white overflow-hidden flex items-center justify-center">
        {/* Force z-index 0 and fixed inset to ensure visibility */}
        <div className="absolute inset-0 z-0">
           {/* Slightly increased dark overlay for better text contrast against lighter background */}
           <div className="absolute inset-0 bg-slate-900/60 z-10" />
           <img 
            src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop" 
            alt="Silk Background Texture" 
            className="w-full h-full object-cover opacity-80" 
           />
        </div>
        
        <div className="relative z-10 max-w-4xl px-6 text-center">
          <FadeIn>
            <h2 className="font-serif text-4xl md:text-6xl italic leading-tight mb-8 drop-shadow-lg">
              "Beauty begins the moment you decide to be yourself."
            </h2>
            <p className="text-rose-300 uppercase tracking-[0.3em] font-bold text-sm">— Coco Chanel</p>
          </FadeIn>
        </div>
      </section>

      {/* Animated Testimonials Section */}
      <section id="reviews" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-12 text-center">
          <FadeIn>
             <span className="text-rose-500 font-bold tracking-widest text-sm uppercase">Community Love</span>
             <h2 className="font-serif text-4xl font-bold text-slate-900 mt-3">The Girls Are Talking</h2>
          </FadeIn>
        </div>

        {/* Moving Rows */}
        <div className="relative flex flex-col gap-8">
          {/* Row 1: Left to Right */}
          <div className="flex w-max animate-marquee gap-8 items-stretch hover:pause">
             {[...reviews, ...reviews].map((review, i) => (
                <div key={`row1-${i}`} className="w-[350px] md:w-[450px] flex-shrink-0 bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-rose-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between">
                  <div>
                    <Quote className="text-rose-200 mb-4 fill-current" size={40} />
                    <div className="flex gap-1 text-rose-400 mb-4">
                      {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                    </div>
                    <p className="text-slate-700 italic text-lg leading-relaxed font-light mb-6">"{review.text}"</p>
                  </div>
                  <div className="flex items-center gap-4 mt-auto">
                    <img src={review.img} alt={review.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-100" />
                    <div>
                      <p className="font-serif font-bold text-slate-900">{review.name}</p>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">{review.loc}</p>
                    </div>
                  </div>
                </div>
             ))}
          </div>

          {/* Row 2: Right to Left */}
          <div className="flex w-max animate-marquee-reverse gap-8 items-stretch hover:pause ml-[-200px]">
             {[...reviews.slice().reverse(), ...reviews.slice().reverse()].map((review, i) => (
                <div key={`row2-${i}`} className="w-[350px] md:w-[450px] flex-shrink-0 bg-rose-50/40 backdrop-blur-md p-8 rounded-3xl border border-rose-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between">
                  <div>
                    <Quote className="text-rose-300/30 mb-4 fill-current" size={40} />
                    <div className="flex gap-1 text-rose-400 mb-4">
                      {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                    </div>
                    <p className="text-slate-700 italic text-lg leading-relaxed font-light mb-6">"{review.text}"</p>
                  </div>
                  <div className="flex items-center gap-4 mt-auto">
                    <img src={review.img} alt={review.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-200" />
                    <div>
                      <p className="font-serif font-bold text-slate-900">{review.name}</p>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">{review.loc}</p>
                    </div>
                  </div>
                </div>
             ))}
          </div>
        </div>
      </section>

      {/* CTA - Modern Premium Redesign */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeIn>
            <div className="relative rounded-[3rem] overflow-hidden bg-slate-900 shadow-2xl isolate">
              {/* Artistic Background */}
              <div className="absolute inset-0 -z-10">
                 <img 
                   src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" 
                   alt="Background" 
                   className="w-full h-full object-cover opacity-30 mix-blend-overlay"
                 />
                 <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-900/40" />
              </div>

              <div className="grid lg:grid-cols-2 gap-12 items-center p-12 lg:p-20">
                {/* Text Content */}
                <div className="text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold uppercase tracking-widest mb-8">
                    <Sparkles size={14} /> Inner Circle Access
                  </div>
                  <h2 className="font-serif text-5xl md:text-6xl font-bold text-white mb-6 leading-[1.1]">
                    Unlock Your <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-200 to-rose-400 italic">Signature Glow.</span>
                  </h2>
                  <p className="text-slate-300 text-lg mb-0 max-w-md leading-relaxed">
                    Join the Beautyhub family. Get exclusive access to new drops, beauty tips, and <span className="text-white font-semibold">15% off your first order.</span>
                  </p>
                </div>

                {/* Interactive Form Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl relative">
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-rose-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                  
                  <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                       <input 
                         type="email" 
                         placeholder="you@example.com" 
                         className="w-full px-6 py-4 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all" 
                       />
                    </div>
                    <button className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-rose-50 transition-colors shadow-lg hover:shadow-white/10 flex items-center justify-center gap-2 group">
                      Get My 15% Off <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <p className="text-xs text-center text-slate-500 mt-2">No spam, just glam. Unsubscribe anytime.</p>
                  </form>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer - Premium Redesign */}
      <footer className="bg-slate-950 text-slate-400 py-16 relative overflow-hidden border-t border-slate-900">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand Column */}
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-400 to-rose-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(225,29,72,0.5)]">
                  <Sparkles size={16} fill="currentColor" />
                </div>
                <span className="font-serif text-2xl font-bold tracking-tight">Beautyhub.</span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-sm">
                Redefining beauty standards for the digital generation. Clean formulas, sustainable packaging, and unapologetic self-expression.
              </p>
              <div className="flex gap-4">
                {[Instagram, Youtube, Twitter].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-rose-600 hover:border-rose-600 hover:text-white transition-all duration-300 group">
                    <Icon size={18} className="group-hover:scale-110 transition-transform" />
                  </a>
                ))}
              </div>
            </div>

            {/* Shop Links */}
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide">Shop</h4>
              <ul className="space-y-4 text-sm font-medium">
                {['New Arrivals', 'Best Sellers', 'Skincare', 'Sets & Bundles'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-rose-400 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide">Company</h4>
              <ul className="space-y-4 text-sm font-medium">
                {['Our Story', 'Ingredients', 'Sustainability', 'Contact'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-rose-400 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-xs text-slate-600 font-medium">
              &copy; 2024 Beautyhub Inc. All rights reserved.
            </div>

            {/* Enhanced Developer Button - Signature Series */}
            <a 
              href="https://www.linkedin.com/in/chhavi-sharma-769417290/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="relative group px-8 py-2.5 bg-slate-900 rounded-full border border-slate-800 hover:border-rose-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <span className="relative text-xs font-medium text-slate-400 group-hover:text-white transition-colors flex items-center gap-2">
                <span>Developed by</span>
                <span className="font-serif italic text-rose-400 font-bold text-sm">Chhavi Sharma</span>
              </span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}