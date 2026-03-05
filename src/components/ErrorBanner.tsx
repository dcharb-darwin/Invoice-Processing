/** Reusable error display used across pages. */
export default function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 p-6 text-red-700 dark:text-red-400">
            {message}
        </div>
    );
}
