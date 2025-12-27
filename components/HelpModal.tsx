import React from 'react';
import { X, Info } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title = "Справка", children }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 rounded-3xl" onClick={onClose}>
            <div className="bg-[#27272a] p-6 rounded-2xl w-full max-w-sm border border-zinc-700 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white"
                >
                    <X size={24} />
                </button>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Info size={24} className="text-orange-500" />
                    {title}
                </h3>
                <div className="space-y-4 text-zinc-300 text-sm">
                    {children}
                </div>
                <button
                    onClick={onClose}
                    className="w-full mt-6 bg-zinc-700 hover:bg-zinc-600 py-3 rounded-xl font-bold transition-colors text-white"
                >
                    Понятно
                </button>
            </div>
        </div>
    );
};
