import React, { useState, useEffect } from "react";

export default function ClockWidget() {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 100); // Fast update for precise seconds

    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    const hrs = String(time.getHours()).padStart(2, "0");
    const mins = String(time.getMinutes()).padStart(2, "0");
    const secs = String(time.getSeconds()).padStart(2, "0");
    return { hrs, mins, secs };
  };

  const formatDate = () => {
    const days = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ];
    const months = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    const dayName = days[time.getDay()];
    const day = time.getDate();
    const monthName = months[time.getMonth()];
    const year = time.getFullYear();

    return `${dayName}, ${day} de ${monthName} de ${year}`;
  };

  const { hrs, mins, secs } = formatTime();

  return (
    <div id="clock-widget-container" className="flex flex-col items-center justify-center p-6 rounded-2xl glass-card neon-border text-center relative overflow-hidden">
      {/* Dynamic green glowing grid background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(0,255,0,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.3)_1px,transparent_1px)] bg-[size:16px_16px]"></div>
      
      {/* Decorative pulse glow in the background */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#00ff00]/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      <div className="text-xs uppercase tracking-widest text-[#00ff00]/60 font-mono mb-2">
        Hora Oficial do Servidor
      </div>

      <div className="flex items-center space-x-1 font-mono text-4xl md:text-5xl font-bold tracking-tight text-white select-none">
        <span className="text-[#00ff00] neon-glow drop-shadow-[0_0_12px_rgba(0,255,0,0.6)] font-light">
          {hrs}
        </span>
        <span className="animate-pulse text-[#00ff00]/40">:</span>
        <span className="text-[#00ff00] neon-glow drop-shadow-[0_0_12px_rgba(0,255,0,0.6)] font-light">
          {mins}
        </span>
        <span className="animate-pulse text-[#00ff00]/40">:</span>
        <span className="text-white/90 drop-shadow-[0_0_5px_rgba(0,255,0,0.3)] font-light text-3xl md:text-4xl self-center">
          {secs}
        </span>
      </div>

      <div className="mt-3 text-sm font-medium text-[#00ff00]/80 tracking-wide font-sans">
        {formatDate()}
      </div>

      <div className="mt-2 flex items-center space-x-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff00] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff00]"></span>
        </span>
        <span className="text-[10px] font-mono uppercase text-[#00ff00]/50">
          Sincronizado via SSL
        </span>
      </div>
    </div>
  );
}
