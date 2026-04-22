import React, { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { motion } from 'motion/react';

const Navbar = ({
    onGetStarted,
    onExplore,
    onFreelance,
    onAbout,
    onHome,
    isExplore = false,
    activeTab = '',
    hideLinks = false
}: {
    onGetStarted: () => void,
    onExplore: () => void,
    onFreelance: () => void,
    onAbout?: () => void,
    onHome?: () => void,
    isExplore?: boolean,
    activeTab?: string,
    hideLinks?: boolean
}) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isSolid = scrolled || isExplore;

    return (
        <nav className={`fixed top-0 left-0 w-full z-50 px-6 py-6 flex items-center justify-between transition-all duration-300 ${isSolid ? 'bg-white/80 backdrop-blur-lg shadow-sm border-b border-zinc-200' : ''}`}>
            <div className="flex items-center gap-2 cursor-pointer" onClick={onHome || (() => window.scrollTo({ top: 0, behavior: 'smooth' }))}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSolid ? 'bg-zinc-900' : 'bg-white'}`}>
                    <Briefcase className={`w-6 h-6 ${isSolid ? 'text-white' : 'text-[#22819A]'}`} />
                </div>
                <span className={`text-2xl font-bold tracking-tighter font-display transition-colors ${isSolid ? 'text-zinc-900' : 'text-white'}`}>WorkVault</span>
            </div>
            {!hideLinks && (
                <div className={`hidden md:flex items-center gap-8 text-sm font-medium transition-colors ${isSolid ? 'text-zinc-500' : 'text-white/60'}`}>
                    {['Explore', 'Freelance', 'About'].map((item) => {
                        const isActive = item.toLowerCase() === activeTab?.toLowerCase();
                        return (
                            <motion.a
                                key={item}
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (item === 'Explore') onExplore();
                                    else if (item === 'Freelance') onFreelance();
                                    else if (item === 'About' && onAbout) onAbout();
                                }}
                                className="relative group py-2"
                                whileHover="hover"
                            >
                                <span className={`relative z-10 transition-colors ${
                                    isActive 
                                    ? (isSolid ? 'text-zinc-900' : 'text-white') 
                                    : (isSolid ? 'group-hover:text-zinc-900' : 'group-hover:text-white')
                                }`}>
                                    {item}
                                </span>
                                <motion.div
                                    variants={{
                                        initial: { scaleX: isActive ? 1 : 0, opacity: isActive ? 1 : 0 },
                                        hover: { scaleX: 1, opacity: 1 }
                                    }}
                                    initial="initial"
                                    animate={isActive ? "hover" : "initial"}
                                    className={`absolute bottom-0 left-0 right-0 h-[2px] ${isSolid ? 'bg-zinc-900' : 'bg-white'} origin-left transition-all duration-300`}
                                />
                                {isActive && (
                                    <motion.div
                                        layoutId="activeGlow"
                                        className={`absolute inset-0 -z-0 blur-xl rounded-full ${isSolid ? 'bg-zinc-900/5' : 'bg-white/10'}`}
                                        transition={{ duration: 0.4 }}
                                    />
                                )}
                            </motion.a>
                        );
                    })}
                </div>
            )}
            {!hideLinks && (
                <button
                    onClick={onGetStarted}
                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all backdrop-blur-md border ${isSolid ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                >
                    Sign In
                </button>
            )}
        </nav>
    );
};

export default Navbar;
