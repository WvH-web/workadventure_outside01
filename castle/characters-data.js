const root='https://together.deine-schule.com/resources/characters/pipoya/';
const character=(id,name,role,age,style,file,intro,questions)=>({id,name,role,age,style,sprite:root+encodeURIComponent(file),intro,questions});
export const characters=[
  character('mira','Mira','Entdeckerin',12,'Neugierig und ein bisschen chaotisch','su1 Student fmale 03.png',
    'In meinen Buechern stecken immer mehr Lesezeichen als Seiten. Welches Abenteuer wuerdest du gern selbst erleben?',[
      ['Ein Abenteuer fuer uns?','Sucht euch zu zweit drei Erzaehlkarten aus. Jeder erfindet einen Satz, dann ist der andere dran. Auch voellig verrueckte Geschichten zaehlen.'],
      ['Was sammelst du?','Ungewoehnliche Woerter. Mein heutiges Lieblingswort ist Sternenstaub. Frag doch jemanden nach seinem Lieblingswort.']]),
  character('noah','Noah','Tueftler',16,'Sportlich, praktisch, voller Ideen','su1 Student male 05.png',
    'Ich baue gern Dinge, die beim ersten Versuch noch nicht funktionieren. Dann gibt es wenigstens etwas zu besprechen.',[
      ['Eine kleine Herausforderung?','Stellt euch gegenseitig ein Bausteinraetsel. Einer beschreibt eine Form, der andere versucht sie nachzubauen. Danach tauscht ihr die Rollen.'],
      ['Allein oder zusammen?','Manchmal tueftle ich erst allein. Aber jemand anderes sieht oft eine Loesung, an die ich nie gedacht haette.']]),
  character('lea','Lea','Musikerin',67,'Elegant, selbstbewusst, mit Buehnenpraesenz','Female 11-2.png',
    'Ein guter Refrain bleibt haengen. Ein guter Bandabend auch. Was war das letzte Lied, das du nicht mehr aus dem Kopf bekommen hast?',[
      ['Eine Idee fuer unsere Runde?','Jeder nennt ein Geraeusch fuer eine erfundene Filmszene. Aus Regen, Schritten und einem einzelnen Ton kann eine ganze Geschichte entstehen.'],
      ['Was magst du an Musik?','Dass Menschen ganz verschiedene Dinge in demselben Lied hoeren. Fragt euch nach dem Konzert, welcher Moment euch am besten gefallen hat.']]),
  character('amir','Amir','Gastgeber',34,'Charmant, gepflegt, weltoffen','Male 11-4.png',
    'Willkommen. Hier muss niemand sofort etwas Besonderes koennen. Ein freier Platz und eine freundliche Frage reichen fuer den Anfang.',[
      ['Wie fange ich ein Gespraech an?','Eine kleine Frage hilft: Was probierst du gerade aus? Oder: Ist hier noch ein Platz frei? Ein Nein ist auch in Ordnung.'],
      ['Wir kennen uns noch nicht.','Jeder erzaehlt eine Sache, die er gern macht, und eine Sache, die er gern einmal ausprobieren wuerde. Vielleicht findet ihr eine Gemeinsamkeit.']]),
  character('elin','Elin','Kuratorin',46,'Farbenfroh und aufmerksam','Teacher fmale 03.png',
    'Eine Ausstellung ist fuer mich der Anfang eines Gespraechs. Bei welchem Fundstueck wuerdest du stehen bleiben?',[
      ['Wie schauen wir gemeinsam?','Waehlt dasselbe Ausstellungsstueck. Erst nennt jeder ein Detail, dann eine Frage. Unterschiedliche Beobachtungen sind besonders spannend.'],
      ['Duerfen wir widersprechen?','Unbedingt. Beschreibt erst, was ihr seht, und dann, was ihr darin erkennt. Andere Menschen koennen dasselbe Bild anders lesen.']]),
  character('farah','Farah','Sternenforscherin',68,'Ruhig, klug und abenteuerlustig','Headmaster fmale.png',
    'Ich kenne viele Sternbilder. Trotzdem entdecke ich immer wieder etwas Neues, wenn mir jemand eine gute Frage stellt.',[
      ['Wohin reisen wir?','Einigt euch auf einen Planeten. Jeder sucht eine Besonderheit, die er den anderen zeigen moechte. Eure Ansichten im Sonnensystem sind nicht automatisch synchron.'],
      ['Was wuerdest du mitnehmen?','Auf eine Reise ins All? Ein Buch, einen Bleistift und eine ziemlich lange Liste mit Fragen. Was waere auf deiner Liste?']]),
  character('otto','Otto','Uhrmacher',77,'Verschmitzt, geduldig, ein Sammler','Headmaster male.png',
    'Die schoensten Ideen brauchen manchmal eine kleine Pause. Ich setze mich gern dazu und hoere erst einmal zu.',[
      ['Hast du ein Raetsel?','Ich habe Seiten, aber keine Fluegel. Ich kann dich auf Reisen schicken, ohne mich zu bewegen. Was bin ich?'],
      ['Die Loesung?','Ein Buch. Und wahrscheinlich kennst du ein viel besseres Raetsel. Erzaehl es doch jemandem am Lesetisch.']]),
  character('sam','Sam','Spielefan',22,'Laessig, fair und energiegeladen','Male 06-3.png',
    'Ich mag Spiele, bei denen man nach einer Runde etwas zu erzaehlen hat. Gewinnen ist schoen. Gemeinsam lachen ist besser.',[
      ['Wie koennen neue Leute mitspielen?','Sagt vor der Runde kurz, ob noch ein Platz frei ist. Erklaert die wichtigste Regel und macht lieber eine kleine Proberunde.'],
      ['Was, wenn es nicht gut laeuft?','Kurz anhalten, fair bleiben und neu absprechen. Niemand muss weiterspielen, wenn es gerade keinen Spass macht.']]),
  character('rosa','Rosa','Gartenentdeckerin',11,'Lebhaft, aufmerksam und humorvoll','Female 20-2.png',
    'Pflanzen wachsen verschieden schnell. Menschen lernen auch verschieden schnell. Beides ist voellig in Ordnung.',[
      ['Ein Gartengespraech?','Jeder beschreibt einen Ort, an dem er sich wohl fuehlt. Was waere in eurem gemeinsamen Wunschgarten?'],
      ['Deine Lieblingspflanze?','Heute die, die ploetzlich eine neue Knospe hat. Kleine Entdeckungen verdienen manchmal mehr Aufmerksamkeit als grosse Plaene.']]),
  character('val','Val','Theatergast',35,'Extravagant, stilvoll, schlagfertig','Female 14-4.png',
    'Auf der Buehne kann ein verlorener Schluessel ploetzlich wichtiger sein als eine ganze Schatztruhe. Es kommt auf die Geschichte an.',[
      ['Koennen wir etwas improvisieren?','Zwei Figuren warten auf denselben Zug. Einer hat etwas Seltsames dabei. Spielt eine Minute und wechselt dann die Rollen.'],
      ['Und ohne Buehne?','Eine Geschichte laesst sich auch am Tisch erzaehlen. Jeder darf passen. Zuschauer sind ebenso willkommen.']]),
  character('kai','Kai','Geschichtensammler',21,'Kreativ, ruhig, eigener Stil','Male 14-1.png',
    'Ich notiere Saetze, bei denen ich sofort ein Bild im Kopf habe. Ein Schloss ist dafuer ein ziemlich guter Ort.',[
      ['Ein Anfang fuer uns?','Als wir die Tuer oeffneten, war der Raum nicht mehr derselbe. Was sieht die erste Person? Was hoert die zweite?'],
      ['Muss die Geschichte perfekt sein?','Nein. Sie muss nicht einmal fertig werden. Manchmal ist die beste Stelle die, ueber die alle gemeinsam nachdenken.']]),
  character('jan','Jan','Lesepate',43,'Freundlich, gelassen, mit trockenem Humor','Teacher male 04.png',
    'Vorlesen ist kein Wettbewerb. Eine ruhige Stimme und ein interessierter Zuhoerer reichen fuer einen guten Anfang.',[
      ['Wie teilen wir eine Lesung auf?','Waehlt einen kurzen Abschnitt. Einer liest, die anderen hoeren zu. Danach kann jeder eine Frage stellen oder eine Stelle nennen, die ihm gefallen hat.'],
      ['Darf ich nur zuhoeren?','Natuerlich. Niemand muss hier etwas vortragen. Ein interessierter Zuhoerer ist fuer eine Lesegruppe genauso wichtig.']]),
];
export function characterById(id){return characters.find(c=>c.id===id)||null;}
