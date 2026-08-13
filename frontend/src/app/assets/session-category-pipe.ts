import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'sessionCategory' })
export class SessionCategoryPipe implements PipeTransform {
  transform(value: number): string {
    switch (value) {
      case 1: return 'Classical';
      case 2: return 'Mat';
      case 3: return 'Reformer';
      case 4: return 'Contemporary';
      case 5: return 'Clinical';
      default: return 'Unknown';
    }
  }
}
