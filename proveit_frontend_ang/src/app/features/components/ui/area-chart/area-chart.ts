import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';

@Component({
  selector: 'app-area-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="w-full h-full relative group">
      <canvas
        baseChart
        [data]="lineChartData"
        [options]="lineChartOptions"
        [type]="lineChartType">
      </canvas>
    </div>
  `
})
export class AreaChart implements OnInit, OnChanges {
  @Input() data: any[] = [];
  @Input() labels: string[] = [];
  @Input() primaryColor: string = '#9a8cff'; // --dd-blue
  @Input() secondaryColor: string = '#a99cff'; // --dd-orange
  @Input() label: string = 'Metric';

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public lineChartType: ChartType = 'line';

  public lineChartData: ChartConfiguration['data'] = {
    datasets: [],
    labels: []
  };

  public lineChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 3,
        borderColor: '',
        fill: 'origin',
        backgroundColor: ''
      },
      point: {
        radius: 0,
        hitRadius: 20,
        hoverRadius: 6,
        hoverBorderWidth: 3,
        hoverBackgroundColor: '#fff'
      }
    },
    scales: {
      x: {
        display: false,
        grid: { display: false }
      },
      y: {
        display: false,
        grid: { display: false }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleFont: { family: 'Mulish', size: 14 },
        bodyFont: { family: 'Mulish', size: 14 },
        padding: 12,
        cornerRadius: 12,
        displayColors: false
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  ngOnInit() {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] || changes['labels']) {
      this.updateChart();
      this.chart?.update();
    }
  }

  private updateChart() {
    this.lineChartData = {
      labels: this.labels,
      datasets: [
        {
          data: this.data,
          label: this.label,
          borderColor: this.primaryColor,
          pointHoverBorderColor: this.primaryColor,
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return '';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            const color = this.primaryColor;
            gradient.addColorStop(0, color + '44'); // 44 is HEX for ~25% alpha
            gradient.addColorStop(1, color + '00');
            return gradient;
          },
        }
      ]
    };
  }
}
