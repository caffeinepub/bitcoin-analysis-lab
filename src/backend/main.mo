import Order "mo:core/Order";

import Nat "mo:core/Nat";





actor {
  type EventType = {
    #halving;
    #crisis;
    #fedEvent;
    #macro;
  };

  type Event = {
    id : Nat;
    date : Text;
    eventType : EventType;
    title : Text;
    description : Text;
    priceAtEvent : Float;
    priceImpactPercent : Float;
  };

  module Event {
    public func compare(e1 : Event, e2 : Event) : Order.Order {
      Nat.compare(e1.id, e2.id);
    };
  };

  type PricePoint = {
    date : Text;
    price : Float;
    volume : Float;
  };

  type EventStats = {
    totalEvents : Nat;
    halvings : Nat;
    crises : Nat;
    fedEvents : Nat;
    macroEvents : Nat;
  };

  type SimilarPeriod = {
    period : Text;
    startDate : Text;
    endDate : Text;
    priceChangePercent : Float;
    description : Text;
  };

  type ContextAnalysis = {
    cyclePhase : Text;
    daysSinceLastHalving : Nat;
    percentFromATH : Float;
    mostSimilarPeriod : SimilarPeriod;
    keySummary : Text;
  };

  type NextEvent = {
    title : Text;
    estimatedDate : Text;
    description : Text;
  };

  type AnticipationAnalysis = {
    nextEvent : NextEvent;
    historicalPatternSummary : Text;
    expectedMinMultiplier : Float;
    expectedMaxMultiplier : Float;
    summary : Text;
  };

  let historicalEvents : [Event] = [
    {
      id = 1;
      date = "2012-11-28";
      eventType = #halving;
      title = "Primeiro Halving";
      description = "Recompensa por bloco reduzida de 50 para 25 BTC";
      priceAtEvent = 12.35;
      priceImpactPercent = 7.2;
    },
    {
      id = 2;
      date = "2013-11-29";
      eventType = #macro;
      title = "Pico de 2013";
      description = "Bitcoin atinge $1,163 pela primeira vez";
      priceAtEvent = 1163.0;
      priceImpactPercent = 540.0;
    },
    {
      id = 3;
      date = "2014-02-24";
      eventType = #crisis;
      title = "Colapso MtGox";
      description = "Maior exchange de Bitcoin declara falência";
      priceAtEvent = 566.45;
      priceImpactPercent = -18.4;
    },
    {
      id = 4;
      date = "2015-08-24";
      eventType = #macro;
      title = "Crash Mercados Globais";
      description = "Correção massiva nos mercados globais impacta cripto";
      priceAtEvent = 228.0;
      priceImpactPercent = -12.0;
    },
    {
      id = 5;
      date = "2016-07-09";
      eventType = #halving;
      title = "Segundo Halving";
      description = "Recompensa por bloco reduzida de 25 para 12.5 BTC";
      priceAtEvent = 650.0;
      priceImpactPercent = 3.5;
    },
    {
      id = 6;
      date = "2017-12-17";
      eventType = #macro;
      title = "Pico de 2017";
      description = "Bitcoin atinge ATH histórico de $19,783";
      priceAtEvent = 19783.0;
      priceImpactPercent = 1824.0;
    },
    {
      id = 7;
      date = "2018-11-25";
      eventType = #crisis;
      title = "Crash de 2018";
      description = "Mercado cripto perde 85% do valor de pico";
      priceAtEvent = 3858.0;
      priceImpactPercent = -45.0;
    },
    {
      id = 8;
      date = "2019-06-26";
      eventType = #macro;
      title = "Recuperação 2019";
      description = "Bitcoin recupera $13,000 após bear market";
      priceAtEvent = 13000.0;
      priceImpactPercent = 237.0;
    },
    {
      id = 9;
      date = "2020-03-12";
      eventType = #crisis;
      title = "Crash COVID";
      description = "Crash global por pandemia, Bitcoin cai 50% em 1 dia";
      priceAtEvent = 4970.0;
      priceImpactPercent = -50.0;
    },
    {
      id = 10;
      date = "2020-05-11";
      eventType = #halving;
      title = "Terceiro Halving";
      description = "Recompensa por bloco reduzida de 12.5 para 6.25 BTC";
      priceAtEvent = 8821.0;
      priceImpactPercent = 2.1;
    },
    {
      id = 11;
      date = "2020-11-04";
      eventType = #fedEvent;
      title = "Fed: Juros Zero";
      description = "Fed mantém juros em zero, liquidez record injetada";
      priceAtEvent = 14500.0;
      priceImpactPercent = 8.5;
    },
    {
      id = 12;
      date = "2021-04-14";
      eventType = #macro;
      title = "ATH Abril 2021";
      description = "Bitcoin atinge $64,863 após listagem da Coinbase";
      priceAtEvent = 64863.0;
      priceImpactPercent = 120.0;
    },
    {
      id = 13;
      date = "2021-11-10";
      eventType = #macro;
      title = "ATH Novembro 2021";
      description = "Bitcoin atinge ATH absoluto de $69,044";
      priceAtEvent = 69044.0;
      priceImpactPercent = 6.5;
    },
    {
      id = 14;
      date = "2022-05-12";
      eventType = #crisis;
      title = "Colapso LUNA/UST";
      description = "Colapso do ecossistema Terra Luna destrói $40B";
      priceAtEvent = 31300.0;
      priceImpactPercent = -30.0;
    },
    {
      id = 15;
      date = "2022-11-11";
      eventType = #crisis;
      title = "Colapso FTX";
      description = "Exchange FTX declara falência com $8B em déficit";
      priceAtEvent = 16900.0;
      priceImpactPercent = -25.0;
    },
    {
      id = 16;
      date = "2023-03-22";
      eventType = #fedEvent;
      title = "Fed: Alta Agressiva";
      description = "Fed eleva juros para combater inflação de 40 anos";
      priceAtEvent = 28400.0;
      priceImpactPercent = 5.0;
    },
    {
      id = 17;
      date = "2023-10-23";
      eventType = #macro;
      title = "Recuperação 2023";
      description = "Bitcoin rompe $30k em meio a aprovações de ETF spot";
      priceAtEvent = 34500.0;
      priceImpactPercent = 15.0;
    },
    {
      id = 18;
      date = "2024-01-10";
      eventType = #fedEvent;
      title = "Aprovação ETF Bitcoin Spot";
      description = "SEC aprova primeiros ETFs Bitcoin spot nos EUA";
      priceAtEvent = 46000.0;
      priceImpactPercent = 12.0;
    },
    {
      id = 19;
      date = "2024-04-20";
      eventType = #halving;
      title = "Quarto Halving";
      description = "Recompensa por bloco reduzida de 6.25 para 3.125 BTC";
      priceAtEvent = 64000.0;
      priceImpactPercent = 0.5;
    },
    {
      id = 20;
      date = "2024-11-05";
      eventType = #macro;
      title = "Eleição Trump 2024";
      description = "Vitória de Trump impulsiona Bitcoin a novo ATH";
      priceAtEvent = 75000.0;
      priceImpactPercent = 30.0;
    },
  ];

  let priceData : [PricePoint] = [
    { date = "2012-01"; price = 5.27; volume = 1000000.0 },
    { date = "2012-06"; price = 6.50; volume = 2500000.0 },
    { date = "2012-11"; price = 12.35; volume = 5000000.0 },
    { date = "2013-04"; price = 135.0; volume = 45000000.0 },
    { date = "2013-11"; price = 1163.0; volume = 150000000.0 },
    { date = "2014-02"; price = 566.0; volume = 120000000.0 },
    { date = "2014-12"; price = 320.0; volume = 35000000.0 },
    { date = "2015-08"; price = 228.0; volume = 42000000.0 },
    { date = "2016-01"; price = 430.0; volume = 65000000.0 },
    { date = "2016-07"; price = 650.0; volume = 80000000.0 },
    { date = "2016-12"; price = 963.0; volume = 110000000.0 },
    { date = "2017-06"; price = 2800.0; volume = 250000000.0 },
    { date = "2017-12"; price = 19783.0; volume = 500000000.0 },
    { date = "2018-06"; price = 7500.0; volume = 320000000.0 },
    { date = "2018-12"; price = 3200.0; volume = 180000000.0 },
    { date = "2019-06"; price = 13000.0; volume = 380000000.0 },
    { date = "2019-12"; price = 7200.0; volume = 240000000.0 },
    { date = "2020-03"; price = 4970.0; volume = 110000000.0 },
    { date = "2020-05"; price = 8821.0; volume = 150000000.0 },
    { date = "2020-09"; price = 10900.0; volume = 200000000.0 },
    { date = "2020-12"; price = 29300.0; volume = 350000000.0 },
    { date = "2021-04"; price = 58700.0; volume = 500000000.0 },
    { date = "2021-11"; price = 69044.0; volume = 550000000.0 },
    { date = "2022-03"; price = 45500.0; volume = 380000000.0 },
    { date = "2022-06"; price = 20000.0; volume = 210000000.0 },
    { date = "2022-11"; price = 16900.0; volume = 180000000.0 },
    { date = "2023-01"; price = 23000.0; volume = 220000000.0 },
    { date = "2023-06"; price = 30500.0; volume = 270000000.0 },
    { date = "2023-12"; price = 44000.0; volume = 320000000.0 },
    { date = "2024-01"; price = 46000.0; volume = 340000000.0 },
    { date = "2024-04"; price = 64000.0; volume = 420000000.0 },
    { date = "2024-07"; price = 57000.0; volume = 460000000.0 },
    { date = "2024-11"; price = 75000.0; volume = 700000000.0 },
  ];

  public query func getEvents() : async [Event] {
    historicalEvents.sort();
  };

  public query func getEventStats() : async EventStats {
    var halvings = 0;
    var crises = 0;
    var fedEvents = 0;
    var macroEvents = 0;

    for (event in historicalEvents.values()) {
      switch (event.eventType) {
        case (#halving) { halvings += 1 };
        case (#crisis) { crises += 1 };
        case (#fedEvent) { fedEvents += 1 };
        case (#macro) { macroEvents += 1 };
      };
    };

    {
      totalEvents = historicalEvents.size();
      halvings;
      crises;
      fedEvents;
      macroEvents;
    };
  };

  public query func getPriceWindow(startDate : Text, endDate : Text) : async [PricePoint] {
    priceData.filter(func(point) {
      point.date >= startDate and point.date <= endDate;
    });
  };

  public query func analyzeCurrentContext() : async ContextAnalysis {
    {
      cyclePhase = "Fase Pós-Halving: Bull Market em Desenvolvimento";
      daysSinceLastHalving = 350;
      percentFromATH = -5.0;
      mostSimilarPeriod = {
        period = "Pós-Terceiro Halving (2020-2021)";
        startDate = "2020-05";
        endDate = "2021-04";
        priceChangePercent = 565.0;
        description = "Após o halving de maio 2020, Bitcoin consolidou por 6 meses antes de iniciar bull market que levou de $9k a $64k";
      };
      keySummary = "O Bitcoin está ~350 dias após o quarto halving (abril/2024). Historicamente, os maiores ganhos ocorrem entre 12-18 meses após o halving. O ciclo atual se assemelha a maio-outubro de 2020, período de acumulação que precedeu a alta de 500%+ em direção ao ATH de $69k.";
    };
  };

  public query func analyzeAnticipation() : async AnticipationAnalysis {
    {
      nextEvent = {
        title = "Quinto Halving Bitcoin";
        estimatedDate = "2028-03";
        description = "Recompensa por bloco será reduzida de 3.125 para 1.5625 BTC. Historicamente, os 6-12 meses antes do halving marcam aceleração do bull market.";
      };
      historicalPatternSummary = "Nos três ciclos anteriores, o Bitcoin atingiu ATH entre 12 e 18 meses após o halving, com multiplicadores de 30x (2012-2013), 30x (2016-2017) e 8x (2020-2021) em relação ao preço no halving.";
      expectedMinMultiplier = 3.0;
      expectedMaxMultiplier = 8.0;
      summary = "Com base nos padrões históricos e no preço no halving de ~$64k, os modelos de ciclo sugerem potencial entre $192k (3x) e $512k (8x) neste ciclo. O próximo halving está estimado para março de 2028. A janela histórica de maior valorização (12-18 meses pós-halving) situa-se entre abril e outubro de 2025.";
    };
  };
};
