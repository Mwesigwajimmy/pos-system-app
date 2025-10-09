'use client';
import { motion } from 'framer-motion';

export default function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.section
            className={className}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
        >
            {children}
        </motion.section>
    );
}