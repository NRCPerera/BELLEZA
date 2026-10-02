import { motion } from 'framer-motion';
export const pageMotion = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.2, ease: 'easeOut' } };
const PageTransition = ({ children, className = '' }) => <motion.div className={className} {...pageMotion}>{children}</motion.div>;
export const StepTransition = ({ children }) => <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18, ease: 'easeOut' }}>{children}</motion.div>;
export default PageTransition;
