import { Component, HostListener, OnInit, Renderer2 } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TreeSidebarComponent } from './layout/rkmain/components/tree-sidebar/tree-sidebar.component';
import { LoadingComponent } from './layout/rkmain/components/loading/loading/loading.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,LoadingComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit{
  title = 'MDR';

 constructor(private renderer: Renderer2) {}

  ngOnInit(): void {
    // this.adjustZoom();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.adjustZoom();
  }

  private adjustZoom(): void {
    const ratio = window.devicePixelRatio || 1;
    const scale = 1 / ratio;

    // Escalamos el contenido
    this.renderer.setStyle(document.body, 'transform', `scale(${scale})`);
    this.renderer.setStyle(document.body, 'transform-origin', '0 0');

    // Corregimos el espacio inferior
    this.renderer.setStyle(document.body, 'width', `${100 * ratio}%`);
    this.renderer.setStyle(document.body, 'height', `${100 * ratio}%`);
    this.renderer.setStyle(document.documentElement, 'overflow', 'hidden');
  }
}
