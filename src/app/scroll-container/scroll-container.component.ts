import { Component, OnInit, OnChanges, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { throttle as _throttle, noop as _noop } from "lodash-es";

enum ScrollDirection {
  UP = 'up',
  DOWN = 'down'
}

enum ScrollListener {
  HOST = 'scroll',
  WINDOW = 'window:scroll'
}

@Component({
  selector: 'app-scroll-container',
  templateUrl: './scroll-container.component.html',
  styleUrls: ['./scroll-container.component.css']
})

export class ScrollContainerComponent implements OnInit, OnChanges {
  private _element: Element;
  private _window: Element;
  public scrollTop = 0;
  @Input() more = true;
  @Input() scrollDelay = 500;
  @Input() scrollOffset = 1000;
  @Output() scrolled: EventEmitter<boolean> = new EventEmitter<boolean>();
  @HostListener(/*ScrollListener.HOST*/"scroll") _scroll: Function;
  @HostListener(/*ScrollListener.WINDOW*/"window:scroll") _windowScroll: Function;

  constructor(private elRef: ElementRef) {
    this._element = this.elRef.nativeElement;
    this._window = document.documentElement as Element;
  }

  ngOnInit() {
    this.setThrottle();
  }

  ngOnChanges(changes: any) {
    if (changes.scrollDelay) this.setThrottle();
  }

  setThrottle() {
    this._scroll = this._windowScroll = _throttle(this.handleScroll, this.scrollDelay);
  }

  getListener = () => this.elRef.nativeElement.clientHeight === this.elRef.nativeElement.scrollHeight
    ? ScrollListener.WINDOW
    : ScrollListener.HOST

  roundTo = (from: number, to: number = this.scrollOffset) => Math.floor(from / to) * to;
  getScrollDirection = (st: number) => this.scrollTop <= st ? ScrollDirection.DOWN : ScrollDirection.UP;

  canScroll(e: Element): boolean {
    //console.log(`Scroll direction: ${this.getScrollDirection(e.scrollTop)}`);
    const scrolled = this.more
      && this.getScrollDirection(e.scrollTop) === ScrollDirection.DOWN
      && this.roundTo(e.clientHeight) === this.roundTo(e.scrollHeight - e.scrollTop); // fix this!
    this.scrollTop = e.scrollTop;
    return scrolled;
  }

  handleScroll = () => this.getListener() === ScrollListener.HOST
    ? this.scrolled.emit( this.canScroll(this._element) )
    : this.scrolled.emit( this.canScroll(this._window) )
}
