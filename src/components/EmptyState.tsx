import { LucideIcon } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ 
  title, 
  description, 
  icon: Icon, 
  actionLabel, 
  onAction 
}: Readonly<EmptyStateProps>) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors duration-300"
    >
      <motion.div 
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mb-6 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors rounded-full" />
        <Icon size={48} className="text-primary relative z-10" />
      </motion.div>
      <h3 className="text-2xl font-bold mb-2 tracking-tight text-foreground">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-8 text-lg font-light leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg" className="shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
