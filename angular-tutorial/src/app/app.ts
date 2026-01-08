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
  protected readonly degrees = signal(true);

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
      let expr = this.expression();

      // Replace caret with JS exponent operator
      expr = expr.replace(/\^/g, '**');

      // Constants
      expr = expr.replace(/\bpi\b/gi, 'Math.PI');
      expr = expr.replace(/\be\b/gi, 'Math.E');

      // Functions -> map to Math equivalents
      const trig = ['sin', 'cos', 'tan'];
      for (const fn of trig) {
        if (this.degrees()) {
          // convert degrees to radians: sin(30) -> Math.sin(Math.PI/180*30)
          const re = new RegExp(fn + '\\(', 'gi');
          expr = expr.replace(re, `Math.${fn}(Math.PI/180*`);
        } else {
          const re = new RegExp(fn + '\\(', 'gi');
          expr = expr.replace(re, `Math.${fn}(`);
        }
      }

      expr = expr.replace(/asin\(/gi, 'Math.asin(');
      expr = expr.replace(/acos\(/gi, 'Math.acos(');
      expr = expr.replace(/atan\(/gi, 'Math.atan(');
      expr = expr.replace(/sqrt\(/gi, 'Math.sqrt(');
      expr = expr.replace(/exp\(/gi, 'Math.exp(');
      expr = expr.replace(/ln\(/gi, 'Math.log(');
      // treat log(...) as base-10
      if ('log10' in Math) {
        expr = expr.replace(/\blog\(/gi, 'Math.log10(');
      } else {
        expr = expr.replace(/\blog\(/gi, '((x)=>Math.log(x)/Math.LN10)(');
      }

      // Factorial: replace n! with fact(n)
      expr = expr.replace(/(\d+)!/g, 'fact($1)');

      const helpers = `
        const fact = n => { if(n<0) return NaN; if(n===0) return 1; let r=1; for(let i=2;i<=n;i++) r*=i; return r; };
      `;

      // eslint-disable-next-line no-new-func
      const fn = new Function(helpers + 'return (' + expr + ')');
      const r = fn();
      this.result.set(String(r));
    } catch (e) {
      this.result.set('Error');
    }
  }

  protected toBinary() {
    try {
      const n = Number(this.result() || this.expression());
      if (!Number.isFinite(n)) {
        this.result.set('NaN');
        return;
      }
      this.result.set((n >>> 0).toString(2));
    } catch {
      this.result.set('Error');
    }
  }

  protected fromBinary() {
    try {
      const s = (this.result() || this.expression()).trim();
      const n = parseInt(s, 2);
      if (Number.isNaN(n)) {
        this.result.set('NaN');
        return;
      }
      this.result.set(String(n));
    } catch {
      this.result.set('Error');
    }
  }

  protected toggleDegrees() {
    this.degrees.set(!this.degrees());
  }
}
