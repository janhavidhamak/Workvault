import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Star, Shield, Zap, Globe, Github, Twitter, Linkedin, Activity, CheckCircle2, Clock, Heart, Briefcase, Plus, Users, LayoutDashboard, Bell, Settings, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Navbar from './Navbar';
import { Review } from './types';

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 1,
    name: "Marcus Thorne",
    role: "CEO at TechFlow",
    text: "WorkVault has completely transformed how our agency handles high-end projects. The security features and talent quality are unmatched in the current market.",
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    featured: true
  },
  {
    id: 2,
    name: "Elena Rodriguez",
    role: "Creative Director",
    text: "The speed of execution and the level of design polish on the platform is incredible. It's my go-to for elite talent.",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    featured: false
  },
  {
    id: 3,
    name: "Sarah Chen",
    role: "Founder of AI Labs",
    text: "Finding specialized AI talent used to take months. With WorkVault, we closed our lead engineer role in 48 hours.",
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    featured: false
  },
  {
    id: 4,
    name: "Julianne Moore",
    role: "Product at GlobalDesign",
    text: "The financial security and vault-grade encryption give our enterprise clients total peace of mind when starting new ventures.",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    featured: true
  }
];

const FloatingCard = ({ delay, children, className }: { delay: number, children: React.ReactNode, className: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 20 }}
    animate={{
      opacity: 1,
      scale: 1,
      y: [0, -10, 0],
    }}
    transition={{
      opacity: { duration: 0.8, delay },
      scale: { duration: 0.8, delay },
      y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay }
    }}
    className={`absolute z-20 glass-panel p-4 rounded-2xl flex items-center gap-3 ${className}`}
  >
    {children}
  </motion.div>
);

const LaptopMockup = () => {
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth the mouse movement
  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  // Transform mouse position to rotation values
  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-15, 15]);
  const translateX = useTransform(springX, [-0.5, 0.5], [-10, 10]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position between -0.5 and 0.5
      mouseX.set((e.clientX / window.innerWidth) - 0.5);
      mouseY.set((e.clientY / window.innerHeight) - 0.5);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="relative w-full h-full flex items-center justify-center perspective-1000 py-12">
      {/* Background Glow that follows mouse */}
      <motion.div
        style={{ x: translateX, opacity: isHovered ? 0.6 : 0.4 }}
        className="absolute w-[120%] h-[120%] bg-primary/20 blur-[100px] rounded-full pointer-events-none z-0 transition-opacity duration-500"
      />

      {/* Floating Elements Around Laptop */}


      <motion.div
        style={{ rotateX, rotateY, scale: 1 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-full max-w-[800px] aspect-[16/10] preserve-3d group z-10 cursor-pointer"
      >
        {/* Laptop Lid / Screen */}
        <div className="absolute inset-0 bg-zinc-800 rounded-3xl border-[8px] border-zinc-900 shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden preserve-3d transition-transform duration-700 group-hover:shadow-[0_0_80px_rgba(34,129,154,0.4)] will-change-transform">
          <div className="absolute inset-0 laptop-screen-gradient overflow-hidden">

            {/* Layer 1: Moving Background Dashboard */}
            <div
              className={`absolute inset-0 p-4 opacity-20 transition-transform duration-1000 will-change-transform ${isHovered ? 'animate-screen-content brightness-110' : 'animate-[screen-content-scroll_40s_linear_infinite]'}`}
            >
              <div className="space-y-6">
                {[1, 2, 3].map((i) => ( // Reduced from 6 to 3
                  <div key={i} className={`h-40 bg-white/5 rounded-2xl border border-white/5 p-6 transition-colors duration-500 ${isHovered ? 'bg-white/10' : ''}`} />
                ))}
              </div>
            </div>

            {/* Layer 2: Live Activity Graph Overlay */}
            <div className="absolute inset-x-0 top-1/4 h-32 px-10 will-change-transform">
              <div className="relative w-full h-full flex items-end gap-1">
                {[40, 70, 45, 90, 65, 80, 55, 95].map((h, i) => ( // Reduced bars from 14 to 8
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: isHovered ? `${Math.min(100, h + 15)}%` : `${h}%` }}
                    transition={{ duration: 0.5, delay: i * 0.02 }}
                    className={`flex-1 rounded-t-sm transition-colors duration-500 ${isHovered ? 'bg-primary' : 'bg-primary/40'}`}
                  />
                ))}
              </div>
            </div>

            {/* Layer 3: Main UI Content */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent flex flex-col justify-end p-10 will-change-transform">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ scale: isHovered ? [1, 1.2, 1] : [1, 1.1, 1] }}
                    transition={{ duration: isHovered ? 1 : 2, repeat: Infinity }}
                    className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40"
                  >
                    <Activity className="w-8 h-8 text-white" />
                  </motion.div>
                  <div>
                    <h4 className={`text-white text-xl font-bold transition-transform duration-500 ${isHovered ? 'translate-x-1' : ''}`}>Revenue Growth</h4>
                    <p className="text-white/40 text-xs uppercase font-bold tracking-widest">+24.5% THIS MONTH</p>
                  </div>
                </div>
                <div className="text-right">
                  <motion.p
                    animate={{ scale: isHovered ? 1.1 : 1 }}
                    className="text-white text-2xl font-black"
                  >
                    $48,290
                  </motion.p>
                  <p className="text-primary text-xs font-bold">ACTIVE PIPELINE</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: isHovered ? `${Math.min(100, 30 + (i * 20) + 15)}%` : `${30 + (i * 20)}%` }}
                      transition={{ duration: 0.8, ease: "circOut" }}
                      className="h-full bg-primary shadow-[0_0_10px_rgba(34,129,154,0.8)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Real-time scanning effect */}
            <motion.div
              animate={{ top: ['-10%', '110%'] }}
              transition={{ duration: isHovered ? 1.5 : 4, repeat: Infinity, ease: "linear" }}
              className={`absolute left-0 right-0 h-[2px] bg-primary/60 blur-[2px] z-20 pointer-events-none transition-opacity duration-500 will-change-[top] ${isHovered ? 'opacity-100' : 'opacity-40'}`}
            />
          </div>

          {/* Surface reflection */}
          <div className={`absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none z-30 transition-opacity duration-700 will-change-opacity ${isHovered ? 'opacity-60' : 'opacity-30'}`} />
        </div>

        {/* Laptop Base (Improved realism) */}
        <div className="absolute -bottom-6 left-6 right-6 h-6 bg-zinc-900 rounded-b-2xl shadow-2xl preserve-3d">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-white/10" />
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1.5 bg-zinc-700 rounded-full opacity-40 blur-[1px]" />
      </motion.div>
    </div>
  );
};

const MovingClouds = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
    {[...Array(3)].map((_, i) => ( // Reduced cloud count
      <motion.div
        key={i}
        initial={{ x: -400, y: Math.random() * 80 + '%' }}
        animate={{ x: '120vw' }}
        transition={{
          duration: 70 + Math.random() * 50, // Slower movement
          repeat: Infinity,
          ease: "linear",
          delay: i * -25
        }}
        className="absolute opacity-10 will-change-transform"
      >
        <div
          className="bg-white blur-[40px] rounded-full" // Reduced blur from 80px
          style={{
            width: 400 + Math.random() * 400 + 'px',
            height: 200 + Math.random() * 200 + 'px'
          }}
        />
      </motion.div>
    ))}
  </div>
);

const BackgroundBlobs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div
      animate={{
        x: [0, 80, 0],
        y: [0, 40, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 30, // Slower duration for less frequent repaints
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/20 blur-[80px] rounded-full will-change-transform" // Reduced blur from 120px
    />
    <motion.div
      animate={{
        x: [0, -60, 0],
        y: [0, 100, 0],
        scale: [1.1, 1, 1.1],
      }}
      transition={{
        duration: 35,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-accent/20 blur-[80px] rounded-full will-change-transform" // Reduced blur from 120px
    />
  </div>
);

const Hero = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-32 pb-20 bg-gradient-to-br from-[#22819A] via-[#1b6a7f] to-[#144f5e]">
      <BackgroundBlobs />
      <MovingClouds />

      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#22819A] mesh-gradient-bg opacity-40 mix-blend-overlay" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full h-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center mb-12">
          {/* Left Column: Text Content */}
          <motion.div style={{ opacity }} className="text-left">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-bold text-white mb-6"
            >
              <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
              ELITE FREELANCE PLATFORM
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-7xl lg:text-8xl font-black font-display leading-[1] tracking-[-0.03em] mb-6 text-white uppercase"
            >
              Built For <br />
              Modern <br />
              <span className="text-white/80">Freelancers</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-white/80 text-base md:text-lg max-w-xl mb-10 leading-relaxed"
            >
              A better way to manage projects, organize clients, and showcase your work.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-6"
            >
              <button
                onClick={onGetStarted}
                className="px-10 py-5 bg-white text-[#22819A] font-black uppercase tracking-tighter rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
              >
                Get Started Now
              </button>
              <a
                href="#features"
                className="px-10 py-5 bg-white/10 border border-white/20 text-white font-black uppercase tracking-tighter rounded-xl hover:bg-white/20 hover:scale-105 active:scale-95 transition-all backdrop-blur-md flex items-center gap-2 group"
              >
                Explore Features
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          </motion.div>

          {/* Right Column: 3D Laptop Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center min-h-[500px]"
          >
            <LaptopMockup />
          </motion.div>
        </div>

        {/* Features Section - Replacing Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <motion.div
            whileHover={{ y: -5, scale: 1.05 }}
            className="flex flex-col items-center text-center gap-3 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white uppercase tracking-tight">Hyper-Speed</p>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">Workflows</p>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ y: -5, scale: 1.05 }}
            className="flex flex-col items-center text-center gap-3 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white uppercase tracking-tight">Vault-Grade</p>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">Security</p>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ y: -5, scale: 1.05 }}
            className="flex flex-col items-center text-center gap-3 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white uppercase tracking-tight">Premium</p>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">Portfolios</p>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ y: -5, scale: 1.05 }}
            className="flex flex-col items-center text-center gap-3 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white uppercase tracking-tight">Global</p>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">Payments</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon: Icon, title, description, index }: { icon: any, title: string, description: string, index: number }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className="relative perspective-1000 group cursor-pointer"
    >
      <div className="glass-card p-8 rounded-3xl group-hover:border-white/50 transition-colors duration-500 overflow-hidden preserve-3d will-change-transform bg-[#22819A] border border-white/10 shadow-2xl">
        {/* Dynamic Glow Effect */}
        <motion.div
          className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.1), transparent 70%)`
          }}
        />

        <div className="relative z-10 preserve-3d">
          <motion.div
            style={{ translateZ: "50px" }}
            className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:bg-white group-hover:scale-110 transition-all duration-500 shadow-lg"
          >
            <Icon className="w-7 h-7 text-white group-hover:text-[#22819A] transition-colors duration-500" />
          </motion.div>
          <h3 style={{ translateZ: "30px" }} className="text-xl font-bold mb-4 text-white group-hover:text-white transition-colors duration-500">
            {title}
          </h3>
          <p style={{ translateZ: "20px" }} className="text-white/70 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      </div>
    </motion.div>
  );
};

const Features = () => {
  const [rotation, setRotation] = useState(0);
  const features = [
    { icon: Zap, title: "Hyper-Speed Workflows", description: "Lightning-fast project tracking and automated client invoicing for peak efficiency." },
    { icon: Shield, title: "Vault-Grade Security", description: "Your data is encrypted and backed up in our enterprise-grade infrastructure." },
    { icon: Star, title: "Premium Portfolio", description: "Showcase your work with stunning, high-converting portfolio templates." },
    { icon: Globe, title: "Global Payments", description: "Accept payments from clients anywhere in the world with ease and speed." },
    { icon: Activity, title: "Live Analytics", description: "Track your growth with real-time data visualization and insights." }
  ];

  useEffect(() => {
    const frame = () => {
      setRotation((prev) => (prev + 0.2) % 360);
      requestAnimationFrame(frame);
    };
    const requestId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(requestId);
  }, []);

  return (
    <section id="features" className="pt-32 pb-12 px-6 relative z-10 bg-surface overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold font-display mb-6 text-zinc-900 tracking-tighter"
          >
            BUILT FOR EXCELLENCE
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 text-lg max-w-2xl mx-auto"
          >
            Every feature is crafted to maximize your productivity and professional image in the global market.
          </motion.p>
        </div>

        <div className="relative h-[500px] flex items-center justify-center perspective-2000 -mt-10">
          <div className="relative w-full max-w-[450px] h-full preserve-3d">
            {features.map((f, i) => {
              const angle = (i * (360 / features.length) + rotation) % 360;
              const radian = (angle * Math.PI) / 180;

              // 3D positioning on a horizontal circle
              const x = Math.sin(radian) * 450;
              const z = Math.cos(radian) * 450;
              const rotateY = angle;

              // Opacity based on depth (z-position)
              const opacity = (z + 450) / 900 * 0.8 + 0.2;

              return (
                <motion.div
                  key={f.title}
                  style={{
                    x,
                    z,
                    rotateY,
                    opacity,
                    position: 'absolute',
                    width: '100%',
                    transformStyle: 'preserve-3d',
                  }}
                  className="inset-0 flex items-center justify-center pointer-events-auto"
                >
                  <div className="w-full scale-110"> {/* Increased scale for larger cards */}
                    <FeatureCard {...f} index={i} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const AirbnbShowcase = ({ freelancers = [], favourites = [], onToggleFavourite, onProfileClick }: { freelancers: any[], favourites?: number[], onToggleFavourite?: (id: number) => void, onProfileClick?: (freelancer: any) => void }) => {
  const featured = freelancers.slice(0, 4);

  return (
    <section className="pt-12 pb-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">Featured talent tonight</h2>
          <p className="text-zinc-500">Explore our most requested experts across the globe.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((f, i) => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-4">
                <img
                  src={f.workImage}
                  alt={`${f.name}'s work`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Profile Photo - Top Left */}
                <div 
                  className="absolute top-4 left-4 z-10"
                  onClick={(e) => { e.stopPropagation(); if (onProfileClick) onProfileClick(f); }}
                >
                  <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-lg group-hover:scale-110 transition-transform">
                    <img src={f.profileImage} alt={f.name} className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); if (onToggleFavourite) onToggleFavourite(f.id); }} 
                    className="p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/30 hover:scale-110 active:scale-95 transition-all group/heart"
                  >
                    <Heart className={`w-6 h-6 transition-colors ${favourites.includes(f.id) ? 'fill-rose-500 text-rose-500' : 'text-white/90 group-hover/heart:text-rose-500 group-hover/heart:fill-rose-500'}`} />
                  </button>
                </div>
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-500" />
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-zinc-900">{f.location}</h3>
                  <p className="text-zinc-500 text-sm">{f.role}</p>
                  <p className="text-zinc-500 text-sm mb-1">{f.name}</p>
                  <p className="text-zinc-900 font-bold">
                    ${f.price} <span className="font-normal text-zinc-500">hour</span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-zinc-900" />
                  <span className="text-sm font-medium">{f.rating}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Reviews = ({ reviews }: { reviews: Review[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!scrollRef.current) return;
      
      const scrollAmount = scrollRef.current.offsetWidth * 0.8;
      if (e.key === 'ArrowRight') {
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else if (e.key === 'ArrowLeft') {
        scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section id="reviews" className="py-32 px-6 bg-surface overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center mb-16 gap-6 relative">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold font-display mb-6 text-zinc-900 tracking-tighter uppercase">Client Success Stories</h2>
            <p className="text-zinc-500 text-lg">WorkVault is powering the next generation of digital leaders. Use arrow keys to explore.</p>
          </div>
          <div className="hidden md:flex gap-2 absolute right-0 bottom-0 pr-4">
            <button 
              onClick={() => scrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' })}
              className="p-3 rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => scrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' })}
              className="p-4 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 active:scale-95"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-12 snap-x snap-mandatory hide-scrollbar -mx-6 px-6"
        >
          {reviews.map((r, i) => (
            <motion.div
              key={r.id || r.name}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`flex-none w-[85vw] md:w-[450px] snap-center glass-card rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 ${r.featured ? "bg-[#22819A] text-white border-none" : "bg-white text-zinc-900"}`}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(r.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-300'}`} />
                  ))}
                  <span className="ml-2 text-xs font-bold font-mono opacity-60 uppercase tracking-tighter">{r.rating} Verified</span>
                </div>
                <p className={`text-lg md:text-xl font-medium leading-relaxed mb-8 ${r.featured ? "text-white" : "text-zinc-800"}`}>
                  "{r.text}"
                </p>
              </div>

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                  <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold tracking-tight">{r.name}</h3>
                  <p className={`text-xs ${r.featured ? "text-white/70" : "text-zinc-500"}`}>{r.role}</p>
                </div>
              </div>
              {/* Theme Decoration */}
              {r.featured && (
                <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                  <Star className="w-48 h-48 fill-white" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="py-20 px-6 border-t border-zinc-200/50 bg-white">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
      <div className="md:col-span-2">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900 font-display">WorkVault</span>
        </div>
        <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
          The all-in-one workspace for high-performing freelancers who demand the best in design and security.
        </p>
      </div>
      <div>
        <h4 className="font-bold mb-6 text-zinc-900 uppercase tracking-wider text-xs">Product</h4>
        <ul className="space-y-4 text-sm text-zinc-500">
          <li><a href="#" className="hover:text-zinc-900 transition-colors">Features</a></li>
          <li><a href="#" className="hover:text-zinc-900 transition-colors">Pricing</a></li>
          <li><a href="#" className="hover:text-zinc-900 transition-colors">Templates</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold mb-6 text-zinc-900 uppercase tracking-wider text-xs">Social</h4>
        <div className="flex gap-4">
          <Github className="w-5 h-5 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer" />
          <Twitter className="w-5 h-5 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer" />
          <Linkedin className="w-5 h-5 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer" />
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto text-zinc-400 text-[10px] font-bold uppercase tracking-widest flex flex-col md:flex-row justify-between gap-4">
      <span>&copy; 2024 WORKVAULT FREELANCING PLATFORM. ALL RIGHTS RESERVED.</span>
      <div className="flex gap-8">
        <a href="#" className="hover:text-zinc-900 transition-colors">PRIVACY POLICY</a>
        <a href="#" className="hover:text-zinc-900 transition-colors">TERMS OF SERVICE</a>
      </div>
    </div>
  </footer>
);

const LandingPage = ({ onEnterApp, onExplore, onFreelance, onAbout, activeTab = '', favourites = [], onToggleFavourite, freelancers, onProfileClick, reviews }: { onEnterApp: () => void, onExplore: () => void, onFreelance: () => void, onAbout?: () => void, activeTab?: string, favourites?: number[], onToggleFavourite?: (id: number) => void, freelancers: any[], onProfileClick?: (freelancer: any) => void, reviews: Review[] }) => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar onGetStarted={onEnterApp} onExplore={onExplore} onFreelance={onFreelance} onAbout={onAbout} activeTab={activeTab} />
      <Hero onGetStarted={onEnterApp} />
      <Features />
      <AirbnbShowcase freelancers={freelancers} favourites={favourites} onToggleFavourite={onToggleFavourite} onProfileClick={onProfileClick} />
      <Reviews reviews={reviews} />
      <Footer />
    </div>
  );
};

export default LandingPage;
