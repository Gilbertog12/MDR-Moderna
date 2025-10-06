import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TreeSidebarComponent } from './layout/rkmain/components/tree-sidebar/tree-sidebar.component';
import { LoadingComponent } from './layout/rkmain/components/loading/loading/loading.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,LoadingComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'MDR';
}
