export interface Script {
  id: string;
  title: string;
  content: string;
}

export interface Category {
  id: string;
  name: string;
  scripts: Script[];
}

export const scriptData: Category[] = [
    {
        id: 'follow-up',
        name: 'Follow-up Pós-Envio',
        scripts: [
            { id: 'f1', title: 'Dia 2: Confirmação e Abertura', content: `Olá, [Nome do Cliente].\n\nTudo bem?\n\nQueria apenas confirmar o recebimento da proposta "[Título da Proposta]".\n\nFicou alguma dúvida inicial que eu possa esclarecer para facilitar sua análise?\n\nFico à sua total disposição!\n\nAbraço,\n[Seu Nome]` },
            { id: 'f2', title: 'Dia 4: Agregando Valor (com Artigo/Case)', content: `Oi, [Nome do Cliente]!\n\nEspero que esteja tendo uma ótima semana.\n\nEnquanto você analisa nossa proposta, lembrei deste [artigo/case de sucesso] que ilustra bem como resolvemos [problema específico] para a [Empresa Similar]: [LINK]\n\nAcredito que pode trazer insights valiosos para o seu cenário.\n\nQualquer ponto, me chame por aqui.\n\nAtenciosamente,\n[Seu Nome]` },
            { id: 'f3', title: 'Dia 7: Foco no Próximo Passo', content: `Olá [Nome do Cliente],\n\nComo está a avaliação da proposta "[Título da Proposta]"?\n\nPara seguirmos, o próximo passo seria [ação, ex: alinhar com a equipe técnica, apresentar para a diretoria]. Há algo que eu possa fazer para ajudar a agilizar essa etapa?\n\nVamos conversar?` },
            { id: 'f4', title: 'Dia 10: Pergunta Direta (Prioridade)', content: `[Nome do Cliente], de 0 a 10, o quão prioritário é resolver [problema do cliente] neste momento? Pergunto para entender como posso ajustar nosso foco e te ajudar da melhor forma possível com a proposta que enviamos.`},
            { id: 'f5', title: 'Dia 14: Quem mais está envolvido?', content: `Olá [Nome do Cliente],\n\nContinuando nossa conversa sobre a proposta, gostaria de saber se há mais alguém do seu time envolvido na decisão. Gostaria de me colocar à disposição para apresentar a solução para outras pessoas, se for o caso.\n\nIsso garante que todos fiquem na mesma página e que possamos responder a todas as perguntas de uma só vez.` },
            { id: 'f6', title: 'Dia 18: Foco em um benefício-chave', content: `Oi [Nome do Cliente], sei que a proposta é detalhada, mas se pudéssemos focar em um único ponto, seria este: [Mencionar o benefício mais forte, ex: a economia de X% no primeiro ano]. Só este ponto já justifica o projeto. O que acha?` },
            { id: 'f7', title: 'Dia 22: Vídeo Rápido (Loom/etc)', content: `[Nome do Cliente], gravei um vídeo rápido (2 min) para destacar os pontos da proposta que mais se conectam com o que conversamos. Acho que pode ajudar a visualizar o impacto.\n\n[LINK PARA O VÍDEO]\n\nMe diga o que achou!` },
            { id: 'f8', title: 'Dia 25: Última Chamada Amigável', content: `Olá [Nome do Cliente], tudo bem?\n\nPassando apenas para um último follow-up sobre a proposta "[Título da Proposta]".\n\nExiste algum obstáculo que eu possa ajudar a remover para seguirmos em frente?\n\nQualquer feedback, positivo ou negativo, é super bem-vindo.` },
            { id: 'f9', title: 'Dia 30: E-mail de "Término"', content: `Olá [Nome do Cliente],\n\nTentei contato algumas vezes sobre nossa proposta, mas não tive retorno. Entendo perfeitamente a correria do dia a dia e que as prioridades podem ter mudado.\n\nPara não ser inoportuno, estou movendo esta oportunidade para meus arquivos. Caso o interesse em resolver [problema do cliente] volte à pauta, por favor, sinta-se à vontade para me contatar. Terei o maior prazer em reativar nossa conversa.\n\nDesejo muito sucesso para você e para a [Empresa do Cliente]!\n\nAbraço,\n[Seu Nome]` },
            { id: 'f10', title: 'Bônus: Reativação pós "Término" (3 meses)', content: `Oi [Nome do Cliente], espero que esteja tudo bem!\n\nHá 3 meses, encerramos nossa conversa sobre [problema do cliente]. Recentemente, lançamos uma [nova feature / condição especial] que torna nossa solução ainda mais aderente ao que você buscava.\n\nVale uma nova conversa de 15 minutos?` },
        ]
    },
    {
        id: 'negotiation',
        name: 'Negociação e Fechamento',
        scripts: [
            { id: 'n1', title: 'Contornando Preço (Foco no ROI)', content: `Olá [Nome do Cliente], compreendo sua preocupação com o investimento. Para garantir que estamos alinhados, podemos detalhar o retorno que a solução trará? Com base em nossas projeções, o investimento de [Valor da Proposta] deve gerar [Benefício Quantificável, ex: uma economia de X% ou um aumento de Y% na produtividade] já nos primeiros meses. Isso faz sentido para você?` },
            { id: 'n2', title: 'Criando Urgência (Bônus por Tempo)', content: `Olá [Nome do Cliente],\n\nEstou entrando em contato com uma boa notícia. Conseguimos uma condição especial para clientes que fecharem a proposta "[Título da Proposta]" até [Data Limite]: [Oferecer Bônus, ex: um workshop de implementação sem custo, 10% de desconto no primeiro ano, etc.].\n\nÉ uma ótima oportunidade para iniciarmos nossa parceria com o pé direito. Vamos aproveitar?` },
            { id: 'n3', title: 'Prova Social (Case Similar)', content: `[Nome do Cliente], enquanto discutimos os detalhes, lembrei do caso da [Empresa Similar], que tinha um desafio muito parecido com o de vocês. Após implementarmos nossa solução, eles alcançaram [Resultado Específico]. Acredito que podemos traçar um caminho de sucesso semelhante para a [Empresa do Cliente].` },
            { id: 'n4', title: 'Fechamento Assumido', content: `Olá [Nome do Cliente]!\n\nCom base em nossas últimas conversas, já estou preparando a documentação para iniciarmos nossa parceria. Para o contrato, podemos usar os dados da [Empresa do Cliente] com o CNPJ [CNPJ do cliente]?\n\nFico no aguardo da sua confirmação para enviarmos para assinatura.` },
            { id: 'n5', title: 'Última Oferta (Flexibilização)', content: `[Nome do Cliente], conversamos bastante e sei que estamos muito perto de uma parceria. Para viabilizarmos o fechamento, o que você acha de ajustarmos para [Nova Condição, ex: um plano de pagamento em X vezes sem juros, a inclusão do serviço Y sem custo adicional]? Esta é a melhor condição que consigo oferecer. Vamos fechar negócio?` },
            { id: 'n6', title: 'Follow-up pós "vou pensar"', content: `Olá [Nome do Cliente], tudo bem? Na nossa última conversa, você mencionou que precisava de um tempo para pensar sobre a proposta. Surgiu alguma dúvida ou ponto adicional que possamos discutir para te ajudar a tomar a melhor decisão para a [Empresa do Cliente]?`},
            { id: 'n7', title: 'Custo da Inação', content: `[Nome do Cliente], entendo a necessidade de avaliar bem a decisão. Uma reflexão que gostaria de propor é: qual o custo de *não* resolver [o problema] nos próximos 6 meses? Às vezes, manter a situação atual pode ser mais caro do que o investimento na solução.` },
            { id: 'n8', title: 'Lidando com "Preciso de aprovação"', content: `Perfeitamente compreensível, [Nome do Cliente]. Existe algum material ou dado específico que eu possa fornecer para te ajudar a apresentar o projeto internamente? Um resumo executivo, um deck de ROI, talvez? Quero ser seu parceiro nessa etapa.` },
            { id: 'n9', title: 'Fechamento por Alternativa', content: `[Nome do Cliente], para finalizarmos os detalhes, você prefere que o faturamento seja no modelo [Opção A] ou [Opção B]? Qual se encaixa melhor no fluxo de vocês?` },
            { id: 'n10', title: 'Resumo dos Benefícios (Summary Close)', content: `[Nome do Cliente], só para recapitular: alinhamos que [Benefício 1], [Benefício 2] e [Benefício 3] são os pontos-chave para a [Empresa do Cliente]. Nossa proposta atende a todos eles. Com base nisso, temos seu OK para avançar com o contrato?` },
        ]
    },
    {
        id: 'post-sale',
        name: 'Pós-Venda',
        scripts: [
            { id: 'ps1', title: 'Boas-vindas e Próximos Passos', content: `Seja muito bem-vindo(a) à [Sua Empresa], [Nome do Cliente]!\n\nEstamos todos muito animados para começar a parceria com a [Empresa do Cliente].\n\nPara darmos início, nosso time de [Setor de Onboarding] entrará em contato em até 24h para agendar a reunião de kickoff. Enquanto isso, se precisar de qualquer coisa, pode contar comigo.\n\nVamos juntos alcançar ótimos resultados!` },
            { id: 'ps2', title: 'Check-in 1 semana: Primeiras Impressões', content: `Olá, [Nome do Cliente]!\n\nComo foi a primeira semana com a nossa solução? A reunião de kickoff atendeu às suas expectativas? Quero garantir que seu início conosco seja o mais tranquilo e produtivo possível. Qualquer feedback é bem-vindo!` },
            { id: 'ps3', title: 'Check-in 30 dias: Colhendo Feedback', content: `Olá, [Nome do Cliente]!\n\nJá se passou um mês desde que iniciamos nossa parceria. Como você avalia os resultados até agora? Estamos no caminho certo para atingir [Objetivo Principal do Cliente]?\n\nSeu feedback é fundamental para nós. Há algo que possamos fazer para melhorar sua experiência?` },
            { id: 'ps4', title: 'Pedido de Depoimento/Avaliação', content: `Olá, [Nome do Cliente].\n\nFico feliz em saber que você está satisfeito(a) com [Nosso Produto/Serviço].\n\nA sua opinião é extremamente valiosa. Se você pudesse tirar 2 minutos para deixar um depoimento sobre sua experiência, nos ajudaria imensamente a mostrar nosso trabalho para outras empresas. Posso te enviar um link?\n\nMuito obrigado pelo apoio!` },
            { id: 'ps5', title: 'Identificando Upsell/Cross-sell', content: `Olá [Nome do Cliente],\n\nNotei que sua equipe está utilizando muito bem o [Produto/Serviço Atual], especialmente a funcionalidade [Funcionalidade].\n\nCom base nisso, acredito que o [Produto de Upsell/Cross-sell] poderia levar seus resultados para o próximo nível, permitindo [Benefício Adicional].\n\nO que acha de uma demonstração rápida de 15 minutos na próxima semana?`},
            { id: 'ps6', title: 'Pedido Estratégico de Indicação', content: `Olá [Nome do Cliente],\n\nNossa parceria com a [Empresa do Cliente] tem sido fantástica e os resultados que estamos construindo juntos me deixam muito orgulhoso.\n\nComo estamos neste bom momento, gostaria de perguntar: você conhece algum outro gestor ou empresa em seu network que também poderia se beneficiar de [Resolver Problema Específico]? Uma indicação sua teria um peso enorme.\n\nDe qualquer forma, agradeço a confiança!\n\nAbraço.`},
            { id: 'ps7', title: 'Check-in 90 dias: Revisão de Negócio', content: `Olá [Nome do Cliente], como vão as coisas?\n\nCompletamos 3 meses de parceria e gostaria de agendar uma breve Revisão Trimestral de Negócio (QBR) para apresentarmos os resultados alcançados, realinhar metas e planejar os próximos passos.\n\nSua agenda está livre na [Data Sugerida]?` },
            { id: 'ps8', title: 'Compartilhando Novidade Relevante', content: `[Nome do Cliente], lembrei de você! Acabamos de lançar a funcionalidade [Nome da Funcionalidade], que automatiza [Processo Relevante para o Cliente]. Como sei que isso era um ponto de atenção para vocês, queria compartilhar em primeira mão.\n\nVeja mais aqui: [Link]` },
            { id: 'ps9', title: 'Agradecimento Fim de Ano', content: `Olá [Nome do Cliente],\n\nNesta reta final do ano, gostaria de fazer um agradecimento especial pela parceria e confiança da [Empresa do Cliente] em nosso trabalho.\n\nQue o próximo ano seja de ainda mais sucesso para todos nós!\n\nBoas festas!` },
            { id: 'ps10', title: 'Pedido de Participação em Case', content: `[Nome do Cliente], os resultados que vocês alcançaram com [Nossa Solução] foram incríveis! Estamos produzindo alguns cases de sucesso e a história da [Empresa do Cliente] seria uma inspiração fantástica. Vocês teriam interesse em participar? Seria uma ótima vitrine para ambos.` },
        ]
    },
     {
        id: 'prospecting',
        name: 'Prospecção Fria',
        scripts: [
            { id: 'p1', title: 'Curto e Direto (Problema/Solução)', content: `Olá [Nome do Cliente],\n\nMeu nome é [Seu Nome]. Ajudo empresas de [Setor do Cliente] a [Resultado, ex: otimizar processos logísticos e reduzir custos em até 15%].\n\nVi que a [Empresa do Cliente] é referência no setor e acredito que uma conversa de 10 minutos poderia ser muito valiosa para vocês.\n\nO que acha da próxima terça-feira, às 10h?\n\nAbraço,\n[Seu Nome]` },
            { id: 'p2', title: 'Conexão LinkedIn com Elogio', content: `Olá, [Nome do Cliente]! Vi seu recente artigo sobre [Tópico do Artigo] no LinkedIn e achei os insights sobre [Ponto Específico] fantásticos. Gostaria de me conectar. Trabalho com soluções que complementam essa visão, ajudando empresas a [Benefício]. Quem sabe não trocamos ideias.` },
            { id: 'p3', title: 'Baseado em "Gatilho" de Notícia/Evento', content: `Olá [Nome do Cliente],\n\nVi no LinkedIn que a [Empresa do Cliente] está contratando para a área de [Área de Contratação]. Com o crescimento da equipe, imagino que [Desafio Relacionado] seja uma prioridade.\n\nNossa solução [Nome da Solução] é desenhada para times em expansão, automatizando [Processo].\n\nSe fizer sentido, adoraria compartilhar como outras empresas no seu ritmo de crescimento estão usando nossa plataforma.` },
            { id: 'p4', title: 'Referência a Conexão Mútua', content: `Olá [Nome do Cliente], tudo bem? [Nome da Conexão em Comum], nosso amigo em comum, me mencionou que você é a pessoa certa para falar sobre [Assunto]. Ele(a) comentou do excelente trabalho que vocês fazem na [Empresa do Cliente].\n\nSerá que teríamos 15 minutos para eu te apresentar uma ideia que pode interessar?` },
            { id: 'p5', title: 'Apontando um Problema (Construtivo)', content: `Olá [Nome do Cliente], sou fã do trabalho da [Empresa do Cliente]. Ao navegar no seu site, notei que [Pequeno Problema ou Oportunidade de Melhoria].\n\nTrabalho exatamente com isso. Temos uma solução que poderia corrigir isso e ainda [Benefício Adicional].\n\nVale uma conversa rápida?` },
            { id: 'p6', title: 'Modelo AIDA (Atenção, Interesse, Desejo, Ação)', content: `Olá [Nome do Cliente],\n\n[Atenção: Uma estatística chocante ou pergunta provocativa sobre o setor de vocês].\n\n[Interesse: Empresas como a sua perdem X% de receita por não otimizar Y]. Nossa solução ataca exatamente esse ponto.\n\n[Desejo: Imagine ter [Benefício Principal]].\n\n[Ação: Podemos agendar 15 minutos na próxima semana para eu te mostrar como?].` },
            { id: 'p7', title: 'Modelo PAS (Problema, Agitação, Solução)', content: `Olá [Nome do Cliente],\n\n[Problema: Muitas empresas de [Setor] lutam com [Problema Comum]].\n\n[Agitação: Isso geralmente leva a [Consequência Negativa 1] e [Consequência Negativa 2], custando tempo e dinheiro].\n\n[Solução: Nós resolvemos isso com [Nossa Solução]].\n\nPodemos conversar por 15 minutos sobre como isso se aplicaria à [Empresa do Cliente]?` },
            { id: 'p8', title: 'Pergunta Rápida e Única', content: `[Nome do Cliente], uma pergunta rápida: quem é o responsável por [Área de Responsabilidade] na [Empresa do Cliente]?` },
            { id: 'p9', title: 'Follow-up do E-mail Frio', content: `Oi [Nome do Cliente], apenas um rápido follow-up sobre o e-mail que enviei na semana passada sobre [Assunto]. Conseguiu dar uma olhada?` },
            { id: 'p10', title: 'Prospecção por Vídeo (Texto)', content: `Olá [Nome do Cliente], gravei um vídeo rápido e personalizado para você, mostrando como a [Sua Empresa] pode ajudar a [Empresa do Cliente] a [Benefício].\n\nEstá aqui: [Link do Vídeo]\n\nDura menos de 2 minutos. Me diga o que acha!` },
        ]
    },
    {
      id: 'meetings',
      name: 'Reuniões e Apresentações',
      scripts: [
        { id: 'm1', title: 'Confirmação de Reunião com Pauta', content: `Olá [Nome do Cliente], tudo bem?\n\nConfirmando nossa reunião amanhã, dia [Data], às [Hora].\n\nPara sermos produtivos, a pauta que preparei é:\n1. Breve entendimento do seu cenário atual.\n2. Demonstração focada em [Ponto de Dor do Cliente].\n3. Próximos passos.\n\nFaltou algo que seja importante para você? O link para a chamada é: [Link da Reunião].\n\nAté lá!` },
        { id: 'm2', title: 'Resumo Pós-Reunião com Ação', content: `Olá [Nome do Cliente],\n\nObrigado pelo seu tempo hoje. Foi uma conversa muito produtiva!\n\nConforme alinhamos, o principal desafio é [Desafio Principal] e nossa solução pode ajudar através de [Solução Principal].\n\nNosso próximo passo combinado é [Ação Combinada, ex: eu te enviar a proposta detalhada até amanhã].\n\nSigo à disposição.\n\nAbraço,\n[Seu Nome]` },
        { id: 'm3', title: 'Follow-up Pós-Demo (Sem Próximo Passo)', content: `Oi [Nome do Cliente], gostou da demonstração que fizemos hoje? Com base no que viu, qual seria sua avaliação inicial e quais os próximos passos que você enxerga do seu lado para avançarmos?`},
        { id: 'm4', title: 'Lembrete (1h antes da Reunião)', content: `Olá [Nome do Cliente], passando apenas para lembrar do nosso encontro em 1 hora, às [Horário]. Até já! Link: [Link da Reunião]` },
        { id: 'm5', title: 'Reagendamento de No-Show', content: `Olá [Nome do Cliente], tivemos um desencontro em nossa reunião de hoje. Sem problemas, imprevistos acontecem! Qual seria um novo dia e horário bom para remarcarmos?` },
        { id: 'm6', title: 'Enviando Materiais Antes da Reunião', content: `Oi [Nome do Cliente], ansioso para nossa conversa amanhã! Para otimizar nosso tempo, estou enviando um breve material sobre [Tópico]. Assim, podemos focar a reunião nos seus pontos de maior interesse. [Link para o Material]` },
        { id: 'm7', title: 'Agradecimento e Pedido de Feedback', content: `[Nome do Cliente], obrigado mais uma vez pela apresentação de hoje. Para que eu possa melhorar sempre, você poderia me dar um feedback rápido sobre o que mais te agradou e se houve algum ponto que não ficou claro?` },
        { id: 'm8', title: 'Trazendo um Especialista', content: `Olá [Nome do Cliente], para a nossa próxima conversa técnica, vou trazer o [Nome do Especialista], nosso [Cargo do Especialista]. Ele(a) tem vasta experiência em [Área] e poderá responder às perguntas mais a fundo. Animado para o papo!` },
        { id: 'm9', title: 'Recapitulando Decisão Importante', content: `[Nome do Cliente], só para garantir que estamos 100% alinhados, confirmo que na reunião de hoje decidimos [Decisão Tomada]. O próximo passo agora é [Ação]. Correto?` },
        { id: 'm10', title: 'Convidando Outros Stakeholders', content: `Olá [Nome do Cliente], com base no que discutimos, talvez seja valioso incluirmos [Nome do Outro Contato ou Setor] na nossa próxima conversa. O que acha? Posso enviar o convite.` },
      ]
    },
    {
        id: 'reengagement',
        name: 'Reengajamento',
        scripts: [
            { id: 'r1', title: 'Lead "Frio" (Curto e Direto)', content: `Oi, [Nome do Cliente]! Tudo bem por aí? Há alguns meses conversamos sobre [Tópico da Conversa Anterior]. Esse assunto ainda é uma prioridade para a [Empresa do Cliente]?` },
            { id: 'r2', title: 'Reaquecendo com Conteúdo de Valor', content: `Olá, [Nome do Cliente]!\n\nFaz um tempo que não nos falamos. Lembrei de você ao ler este relatório sobre [Tópico Relevante para o Cliente]: [LINK]\n\nAchei que os dados sobre [Insight Específico] poderiam ser úteis para seus projetos na [Empresa do Cliente].\n\nAbraço!` },
            { id: 'r3', title: 'O "breakup" email (Should I stay or go?)', content: `Olá [Nome do Cliente], tenho tentado contato sem sucesso e imagino que suas prioridades tenham mudado. Se não houver mais interesse, sem problemas. Você prefere que eu:\n\n1. Encerre o contato por agora.\n2. Faça um follow-up daqui a 3 meses.\n\nÉ só responder com "1" ou "2". Obrigado!` },
            { id: 'r4', title: 'Mencionando um Concorrente (com cuidado)', content: `Olá [Nome do Cliente], vi que vocês talvez estejam avaliando soluções como a da [Concorrente]. É uma ótima ferramenta. Se estiver comparando opções, gostaria de destacar nosso diferencial em [Ponto Forte]. Vale 10 minutos?` },
            { id: 'r5', title: 'Compartilhando um Case de Sucesso', content: `[Nome do Cliente], sei que a [Empresa do Cliente] busca [Objetivo]. Queria compartilhar o case da [Empresa Similar], que alcançou [Resultado] conosco. A história deles é bem parecida com a sua. Veja aqui: [Link do Case]` },
            { id: 'r6', title: 'Convite para Evento/Webinar Exclusivo', content: `Olá [Nome do Cliente], no dia [Data] faremos um webinar exclusivo sobre [Tema]. Como já conversamos sobre isso, reservei um convite para você. As vagas são limitadas. Quer participar? [Link de Inscrição]` },
            { id: 'r7', title: 'Novidade na [Sua Empresa]', content: `Oi [Nome do Cliente], sei que não avançamos da última vez, mas não podia deixar de compartilhar: acabamos de [Anunciar Grande Conquista, ex: receber um investimento, ganhar um prêmio, lançar um produto]. Estamos em um ótimo momento e seria ótimo retomar nossa conversa.` },
            { id: 'r8', title: 'Pedindo Feedback Sincero', content: `Olá [Nome do Cliente], sei que não fechamos negócio, e está tudo bem. Para meu desenvolvimento profissional, você poderia me dizer em uma frase qual foi o principal motivo? Agradeço muito a sinceridade.` },
            { id: 'r9', title: 'Simplificando a Oferta', content: `[Nome do Cliente], da última vez conversamos sobre a solução completa. Pensando em você, criamos um pacote mais enxuto, focado apenas em [Resolver 1 Problema]. O investimento é menor e o resultado é rápido. Faz sentido para o seu momento atual?` },
            { id: 'r10', title: 'Mensagem "Lembrei de você"', content: `Oi [Nome do Cliente], passei em frente à [Empresa do Cliente] hoje / vi uma notícia sobre vocês e lembrei da nossa conversa. Espero que esteja tudo ótimo por aí. Grande abraço!` },
        ]
    },
];
