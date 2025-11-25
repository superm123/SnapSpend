import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-900">
        Welcome to Budget Planner!
      </h1>
      <p className="text-lg text-gray-700 mb-8 text-center">
        Track your expenses easily and efficiently.
      </p>
      <div className="space-x-4">
        <Link
          href="/summary"
          className="bg-indigo-600 text-white px-6 py-3 rounded-md text-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Go to Summary
        </Link>
      </div>
    </div>
  );
}

