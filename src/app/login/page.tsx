'use client'

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FaCheckCircle, FaChartBar, FaFire } from "react-icons/fa";

export default function LoginPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Carregando...
      </div>
    );
  }

  if (session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-center">
          Bem-vindo, {session.user?.name}
        </h1>
        <img
          src={session.user?.image || "/default-avatar.png"}
          alt="Avatar"
          className="w-28 h-28 rounded-full mb-4 shadow-lg"
        />
        <p className="mb-6 text-gray-300 text-center max-w-xl">
          Agora você pode acompanhar suas calorias, controlar seus macros e muito mais!
        </p>
        <button
          onClick={() => signOut()}
          className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-lg text-lg transition"
        >
          Sair
        </button>
        <Link href="/" className="mt-4 text-green-400 hover:underline">
          Voltar para o site
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-3xl w-full flex flex-col items-center gap-8">
        <h1 className="text-5xl font-bold text-center">Bem-vindo ao NutriTrack</h1>
        <p className="text-gray-300 text-center text-lg max-w-2xl">
          Controle seu consumo diário, visualize seus macros e acompanhe sua jornada de forma visual e prática.
        </p>

        {/* Gráficos fake */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-4 text-center">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <FaFire className="text-orange-400 text-4xl mx-auto mb-2" />
            <h3 className="text-xl font-semibold">Calorias</h3>
            <p className="text-gray-400">Veja quanto já consumiu hoje.</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <FaChartBar className="text-blue-400 text-4xl mx-auto mb-2" />
            <h3 className="text-xl font-semibold">Macros</h3>
            <p className="text-gray-400">Proteínas, Carboidratos e Gorduras.</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <FaCheckCircle className="text-green-400 text-4xl mx-auto mb-2" />
            <h3 className="text-xl font-semibold">Metas</h3>
            <p className="text-gray-400">Acompanhe seu progresso diário.</p>
          </div>
        </div>

        {/* Botão Google */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="mt-8 bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-lg flex items-center gap-3 text-lg font-semibold transition"
        >
          <FcGoogle className="text-2xl" />
          Entrar com Google
        </button>
      </div>
    </div>
  );
}
