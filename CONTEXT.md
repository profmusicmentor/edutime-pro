# EduTime Pro

App web per costruire l'orario scolastico di un istituto italiano (anche a indirizzo musicale): cattedre, generazione automatica, controllo conflitti, sostituzioni, stampa e export Excel.

## Language

**Sostituzione**:
Copertura di una o più ore di lezione quando un docente è assente.
_Avoid_: Supplenza (termine HR per il contratto di impiego a tempo determinato — significato diverso), sostituto

**Docente sostituto**:
Il docente che copre le ore di un collega assente durante una sostituzione.
_Avoid_: Supplente

**Sede**:
Un edificio/plesso scolastico distinto all'interno dello stesso istituto, nel caso di un istituto multi-sede.
_Avoid_: Plesso, edificio

**Cattedra**:
Il monte ore settimanale assegnato a un docente su una materia e un insieme di classi. Non è un campo dedicato: è calcolato sommando gli assignments del docente.
_Avoid_: —

**Docente**:
Categoria ombrello per chi insegna: docente di materia, docente di sostegno, docente di strumento.
_Avoid_: Staff, personale (troppo generico)

**Docente di materia**:
Docente che insegna una materia curricolare.
_Avoid_: —

**Docente di sostegno**:
Docente che supporta uno o più alunni con disabilità.
_Avoid_: —

**Docente di strumento**:
Docente che insegna uno strumento musicale nell'indirizzo musicale.
_Avoid_: —

**Classe**:
Un gruppo di alunni identificato da anno + sezione (es. "1A").
_Avoid_: Sezione (concetto diverso, vedi sotto)

**Sezione**:
La lettera che identifica un percorso all'interno di un anno (es. "A", "B"), a cui è associato un modello orario (modelloA/modelloB). Non coincide con Classe.
_Avoid_: Classe

**Aula DADA** (Didattica per Ambienti di Apprendimento):
Modalità didattica in cui alcune aule sono dedicate a una materia/laboratorio specifico in una fascia oraria, invece di assegnare un'aula fissa a ogni classe. Non ha un campo dedicato: si realizza taggando una room con le materie a cui è riservata.
_Avoid_: —

**Classe mista** (lingue straniere):
Due classi che studiano la stessa lingua straniera (spagnolo/francese/tedesco) con lo stesso docente: il generatore accorpa attivamente le ore, piazzandole negli stessi slot per entrambe.
_Avoid_: Gruppo misto

**Vincolo di accorpamento** (co-presenza):
Dichiarazione che due classi dovrebbero avere una certa materia (qualsiasi) nello stesso slot orario. A differenza della Classe mista, non è imposto dal generatore: viene solo verificato dopo, nella scheda Conflitti, che segnala un warning se le due classi non risultano allineate.
_Avoid_: Vincolo di gruppo
