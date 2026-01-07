import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('angular-tutorial');

  protected readonly expression = signal('');
  protected readonly result = signal('');

  protected append(value: string) {
    this.expression.set(this.expression() + value);
  }

  protected clear() {
    this.expression.set('');
    this.result.set('');
  }

  protected del() {
    this.expression.set(this.expression().slice(0, -1));
  }

  protected evaluate() {
    try {
      // NOTE: using Function for simple expression evaluation in this tutorial
      // In production, use a proper expression parser to avoid security risks.
      // eslint-disable-next-line no-new-func
      const fn = new Function('return ' + this.expression());
      const r = fn();
      this.result.set(String(r));
    } catch (e) {
      this.result.set('Error');
    }
  }
}
