/** Reusable loading spinner used across all pages. */
export default function LoadingSpinner({ className = "py-20" }: { className?: string }) {
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
    );
}
