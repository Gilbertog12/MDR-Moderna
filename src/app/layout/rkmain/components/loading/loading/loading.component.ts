import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../../../core/services/loading.service';

@Component({
  selector: 'app-loading',
  imports: [AsyncPipe],
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss'
})
export class LoadingComponent {
loadingService = inject(LoadingService);
}
