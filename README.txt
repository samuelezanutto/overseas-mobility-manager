================================================================================
OVERSEAS MOBILITY MANAGER
Tecnologie e Applicazioni Web - a.a. 2025/2026
================================================================================

Web application per la gestione della mobilita' Overseas presso l'Universita'
Ca' Foscari Venezia.


--------------------------------------------------------------------------------
1. ARCHITETTURA
--------------------------------------------------------------------------------

Il sistema e' composto da tre container Docker separati:

  backend    Node.js + Express + TypeScript, API REST     porta interna 3000
  frontend   Angular SPA compilata e servita da nginx     porta 80 (esposta)
  mongo      MongoDB                                      porta interna 27017

Solo la porta 80 e' esposta all'host. nginx serve il bundle Angular e fa da
reverse proxy verso il backend per le chiamate alle API: backend e database
comunicano tra loro sulla rete interna di Docker e non sono raggiungibili
dall'esterno.


--------------------------------------------------------------------------------
2. PREREQUISITI
--------------------------------------------------------------------------------

  - Docker
  - Docker Compose

Non e' necessario installare Node.js, Angular CLI o MongoDB sulla macchina:
tutto viene compilato ed eseguito all'interno dei container.

Come richiesto, le cartelle node_modules non sono incluse nell'archivio.
Le dipendenze vengono installate automaticamente durante la build dei
container: non e' quindi necessario eseguire alcun npm install manuale.


--------------------------------------------------------------------------------
3. AVVIO DELL'APPLICAZIONE
--------------------------------------------------------------------------------

Dalla cartella radice del progetto, quella che contiene docker-compose.yml:

  docker compose up --build

Questo comando compila il backend TypeScript, compila il frontend Angular in
modalita' di produzione, avvia MongoDB e collega i tre container tra loro.

La prima esecuzione richiede alcuni minuti: vengono scaricate le immagini base
e installate tutte le dipendenze.

L'applicazione e' pronta quando nei log compaiono le righe:

  backend-1   | MongoDB connected
  backend-1   | Server listening on http://localhost:3000

A quel punto l'applicazione e' raggiungibile all'indirizzo:

  http://localhost


Per gli avvii successivi non e' necessario ricompilare:

  docker compose up


Per arrestare l'applicazione, dal terminale in cui e' in esecuzione:

  Ctrl+C

oppure, da un altro terminale, nella stessa cartella:

  docker compose down


Per arrestare l'applicazione azzerando anche il database, in modo che i dati
di test vengano ricaricati al successivo avvio:

  docker compose down -v


--------------------------------------------------------------------------------
4. DATI DI TEST
--------------------------------------------------------------------------------

Al primo avvio, se il database e' vuoto, il backend precarica automaticamente
la lista delle istituzioni partner, sei utenti che coprono tutti e tre i
ruoli previsti dal sistema, e sette domande di mobilita' di esempio, una per
ciascuno stato del workflow e distribuite su piu' paesi/istituzioni ospitanti
- utili per vedere subito la dashboard dell'Ufficio Overseas popolata, senza
dover prima creare domande a mano.

Il caricamento avviene solo a database vuoto, quindi i riavvii successivi non
generano duplicati.

Tutti gli utenti hanno la stessa password:  password123

  RUOLO             EMAIL
  ---------------   ------------------------------------
  Studente          mario.rossi@stud.unive.it
  Studente          giulia.bianchi@stud.unive.it
  Studente          luca.ferrari@stud.unive.it
  Docente referente prof.bergamasco@unive.it
  Docente referente prof.focardi@unive.it
  Ufficio Overseas  ufficio.overseas@unive.it


--------------------------------------------------------------------------------
5. WORKFLOW DI PROVA
--------------------------------------------------------------------------------

Per verificare l'intero ciclo di vita di una domanda di mobilita', accedere
con i diversi utenti nell'ordine seguente. Ogni ruolo vede azioni diverse
sulla stessa domanda.

  FASE 1 - PRIMA DELLA PARTENZA

  1.  Studente (mario.rossi@stud.unive.it)
      - creare una nuova domanda scegliendo istituzione ospitante,
        docente referente, anno accademico e periodo
      - aggiungere uno o piu' esami, indicando la corrispondenza tra il
        corso estero e quello del piano di studi Ca' Foscari
      - caricare un file PDF qualsiasi come Learning Agreement

  2.  Docente referente (prof.bergamasco@unive.it)
      - aprire la domanda e approvare il Learning Agreement
        (in caso di rifiuto viene richiesta una motivazione)

  3.  Ufficio Overseas (ufficio.overseas@unive.it)
      - contrassegnare la fase pre-partenza come completata
        (possibile solo se il Learning Agreement risulta approvato)


  FASE 2 - DURANTE LA MOBILITA'

  4.  Studente
      - inserire le date effettive di arrivo e partenza
      - proporre una modifica al piano esami, indicando una descrizione,
        il nuovo esame e caricando un Learning Agreement aggiornato

  5.  Docente referente
      - approvare o rifiutare la modifica proposta
        (se approvata, i mapping precedenti vengono disattivati e
        sostituiti da quelli nuovi; se rifiutata, restano invariati)


  FASE 3 - AL RIENTRO

  6.  Studente
      - caricare un file PDF qualsiasi come Transcript of Records
      - inserire voto e data per ciascun esame sostenuto all'estero

  7.  Docente referente
      - approvare (o rifiutare) il voto inserito dallo studente per
        ciascun esame

  8.  Ufficio Overseas
      - chiudere la domanda
        (possibile solo se il Transcript e' stato caricato e tutti gli
        esami attivi risultano approvati)


  FASE OPZIONALE - CANCELLAZIONE (in qualsiasi momento prima della chiusura)

  - Studente: richiedere la cancellazione della domanda, indicando un motivo
  - Ufficio Overseas: approvare o rifiutare la richiesta, oppure cancellare
    direttamente la domanda in qualsiasi momento, con un proprio motivo


  DASHBOARD UFFICIO OVERSEAS

  Accedendo come Ufficio Overseas (ufficio.overseas@unive.it) e' visibile,
  sopra l'elenco delle domande, un riepilogo con un contatore per ciascuno
  stato (cliccabile, per filtrare l'elenco) e due filtri, per paese e per
  istituzione ospitante. E' gia' popolato con le sette domande di esempio
  precaricate al primo avvio (vedi sezione 4), senza bisogno di crearne di
  nuove per vederlo in azione.


--------------------------------------------------------------------------------
6. STRUTTURA DEL CODICE SORGENTE
--------------------------------------------------------------------------------

  overseas-app/
  |
  +-- docker-compose.yml          orchestrazione dei tre container
  +-- README.txt
  |
  +-- backend/
  |   +-- Dockerfile
  |   +-- package.json
  |   +-- tsconfig.json
  |   +-- src/
  |       +-- index.ts            punto di ingresso, montaggio delle route
  |       +-- config.ts           configurazione JWT
  |       +-- db.ts               connessione a MongoDB
  |       +-- seed.ts             caricamento dei dati di test
  |       +-- models/             schemi Mongoose
  |       |   +-- User.ts
  |       |   +-- Institution.ts
  |       |   +-- MobilityApplication.ts
  |       +-- routes/             endpoint REST
  |       |   +-- auth.ts
  |       |   +-- users.ts
  |       |   +-- institutions.ts
  |       |   +-- applications.ts
  |       +-- middleware/
  |           +-- auth.ts         verifica del token JWT
  |
  +-- frontend/overseas-frontend/
      +-- Dockerfile
      +-- nginx.conf              configurazione del reverse proxy
      +-- package.json
      +-- src/app/
          +-- app.routes.ts       definizione delle rotte
          +-- app.config.ts       provider dell'applicazione
          +-- core/
          |   +-- services/       comunicazione con il backend
          |   +-- guards/         protezione delle rotte
          |   +-- interceptors/   inserimento automatico del token JWT
          |   +-- utils/          labels.ts, mappatura enum -> etichette
          +-- pages/
              +-- login/
              +-- register/
              +-- dashboard/
              +-- application-new/
              +-- application-detail/


--------------------------------------------------------------------------------
7. NOTE
--------------------------------------------------------------------------------

AUTENTICAZIONE
L'autenticazione utilizza JSON Web Token. Il token viene generato al login,
restituito al client e conservato nel localStorage del browser. Un interceptor
Angular lo inserisce automaticamente nell'header Authorization di ogni
richiesta successiva. Il backend lo verifica tramite un middleware applicato
a tutte le route protette.

AUTORIZZAZIONE
Il controllo degli accessi avviene su due livelli: il ruolo dell'utente e la
proprieta' della singola domanda. Uno studente puo' operare solo sulle proprie
domande, un docente solo su quelle di cui e' referente, l'Ufficio Overseas su
tutte.

FILE CARICATI
I file caricati dagli utenti sono salvati in un volume Docker dedicato e sono
scaricabili dall'interfaccia web solo dagli utenti autorizzati a visualizzare
la domanda a cui appartengono.

CONFIGURAZIONE
Il secret usato per firmare i token JWT viene letto dalle variabili d'ambiente.
Nel docker-compose.yml e' previsto un valore di default per lo sviluppo, cosi'
che l'applicazione sia eseguibile senza configurazione aggiuntiva.
