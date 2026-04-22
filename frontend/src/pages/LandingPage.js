import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Search, Settings, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import logo from '../tools/Logo_1.png';

const LandingPage = () => {
  const roles = [
    {
      title: 'DOUANE',
      description: 'Création et gestion des passeports numériques, enregistrement des voyages, renouvellements et révocations.',
      icon: <Shield size={48} className="text-gold-light dark:text-gold" />,
      color: 'border-gold-light dark:border-gold'
    },
    {
      title: 'POLICE',
      description: 'Vérification de l\'authenticité des passeports et consultation de l\'historique des voyages.',
      icon: <Search size={48} className="text-blockchain-light dark:text-blockchain" />,
      color: 'border-blockchain-light dark:border-blockchain'
    },
    {
      title: 'ADMIN',
      description: 'Gestion des agents, confirmation des révocations et supervision des logs d\'audit.',
      icon: <Settings size={48} className="text-primary-light dark:text-primary" />,
      color: 'border-primary-light dark:border-primary'
    }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-light dark:text-text">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23B8860B' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
          {/* Theme Toggle */}
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>

          <div className="text-center">
            <img src={logo} alt="PASSMAR" className="h-24 w-auto mx-auto mb-8" />
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gold-light dark:from-gold to-primary-light dark:to-primary bg-clip-text text-transparent">
              Système National de Passeport Numérique
            </h1>
            <p className="text-xl text-muted-light dark:text-muted mb-8 max-w-3xl mx-auto">
              Sécurisé par la Blockchain — Réservé aux Agents Habilités
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-3 bg-primary-light dark:bg-primary hover:bg-primary dark:hover:bg-primary/90 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Accéder au Système
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>

      {/* Roles Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-text-light dark:text-text">Rôles et Fonctionnalités</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {roles.map((role, index) => (
            <div key={index} className={`bg-surface-light dark:bg-surface-dark border-2 ${role.color} rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors`}>
              <div className="flex justify-center mb-6">
                {role.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gold-light dark:text-gold">{role.title}</h3>
              <p className="text-muted-light dark:text-muted leading-relaxed">{role.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Blockchain Badge */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-blockchain/20 dark:bg-blockchain/20 border border-blockchain-light dark:border-blockchain rounded-full px-6 py-3">
            <Shield size={20} className="text-blockchain-light dark:text-blockchain" />
            <span className="text-blockchain-light dark:text-blockchain font-medium">Blockchain Privée</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-muted-light dark:text-muted">
          <p>EMSI · Génie Informatique · 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;