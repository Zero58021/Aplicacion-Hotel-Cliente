import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonRefresher } from '@ionic/angular';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false
})
export class Tab2Page implements OnInit {

  textoBusqueda: string = '';
  filtroRango: string = '';
  filtroTribu: string = '';

  yokais = [
    {
      id: 1,
      nombre: 'Whisper',
      rango: 'B',
      tribu: 'Místico',
      habilidades: ['Aviso', 'Consejo'],
      imagenUrl: 'assets/yokais/whisper.svg',
      mostrar: false,
      visible: true
    },
    {
      id: 2,
      nombre: 'Jibanyan',
      numeroYokai: '093',
      rango: 'A',
      tribu: 'Luchador',
      biografia: 'Un gato fantasma que adora comer barras de chocolate y luchar contra coches.',
      habilidades: ['Adrenalina'],
      ataque: ['Garras Afiladas'],
      animaximum: 'Patitas Furiosas',
      espiritacion: 'No tan Rápido: Reduce la VEL de un rival usando un sello paralizante.',
      evoluciones: ['Robonyan', 
        ' Jibanyan S'],
      fusiones: ['Jibanyan + Komasan = Komajiro'],
      alimentoFavorito: 'Barras de Chocolate',
      localizacion: 'Cerca de los coches',
      imagenAdicional: 'assets/fotos/jibanyan-additional.jpg',
      imagenMedalla: 'assets/medallas/jibanyan-medalla.png',
      imagenUrl: 'assets/fotos/descarga.png',
      mostrar: false,
      visible: true
    },
    {
      id: 3,
      nombre: 'Komasan',
      rango: 'B',
      tribu: 'Místico',
      habilidades: ['Espíritu Guardián', 'Lanza Mística'],
      imagenUrl: 'assets/yokais/komasan.svg',
      mostrar: false,
      visible: true
    }
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const id = +params['id'];
      if (id) {
        const yokaiSeleccionado = this.yokais.find(y => y.id === id);
        if (yokaiSeleccionado) {
          this.yokais.forEach(y => y.mostrar = false);
          yokaiSeleccionado.mostrar = true;
        }
      }
    });
  }

  // Función para alternar la visibilidad de cada Yo-kai
  toggleYokai(yokai: any) {
    this.yokais.forEach(y => { if (y !== yokai) y.mostrar = false; });
    yokai.mostrar = !yokai.mostrar;
  }

  // Función para filtrar Yo-kai por nombre, rango y tipo
  filtrarYokais() {
    const texto = this.textoBusqueda.toLowerCase();

    this.yokais.forEach(yokai => {
      const nombreCoincide = yokai.nombre.toLowerCase().includes(texto);
      const rangoCoincide = this.filtroRango ? yokai.rango === this.filtroRango : true;
      const tipoCoincide = this.filtroTribu ? yokai.tribu === this.filtroTribu : true;

      yokai.visible = nombreCoincide && rangoCoincide && tipoCoincide;
    });
  }

  // Función que se llama al hacer "pull-to-refresh"
  doRefresh(event: any) {
    console.log('Buscando Yo-kais...');

    // Simulamos la actualización de los datos
    setTimeout(() => {
      // Aquí puedes realizar una llamada a tu servicio o recargar datos
      // Simulando recarga de datos
      this.yokais = [...this.yokais]; // Fuerza la actualización de la lista de yokais

      // Finaliza el refresco
      event.target.complete();
      console.log('Yo-kais encontrados!');
    }, 2000); // Simula un retraso de 2 segundos
  }
}
