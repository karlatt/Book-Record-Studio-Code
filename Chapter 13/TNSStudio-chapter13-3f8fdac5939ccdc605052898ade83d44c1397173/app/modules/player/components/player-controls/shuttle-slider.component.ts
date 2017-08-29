// angular
import { Component, Input, ViewChild, ElementRef } from '@angular/core';

// nativescript
import { GestureTypes } from 'ui/gestures';
import { View } from 'ui/core/view';
import { Label } from 'ui/label';
import { Slider } from 'ui/slider';
import { Observable } from 'data/observable';
import { isIOS, screen } from 'platform';

// libs
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs/Subscription';

// app
import { PlayerActions } from '../../actions';
import { PlayerService } from '../../services';
import { IPlayerState } from '../../states';

@Component({
  moduleId: module.id,
  selector: 'shuttle-slider',
  templateUrl: 'shuttle-slider.component.html',
  styles: [`
    .slider-area {
      margin: 10 10 0 10;
    }
    .slider {
      padding:0;
      margin:0 0 5 0;
      height:5;
    }
  `]
})
export class ShuttleSliderComponent {

  @ViewChild('sliderArea') sliderArea: ElementRef;
  @ViewChild('slider') slider: ElementRef;
  @ViewChild('currentTimeDisplay') currentTimeDisplay: ElementRef;

  public duration: number;
  public durationDisplay: string;

  private _sliderArea: View;
  private _currentTimeDisplay: Label;
  private _slider: Slider;
  private _screenWidth: number;
  private _seekDelay: number;
  private _sub: Subscription;
  private _subCurrentTime: Subscription;

  constructor(
    private store: Store<any>,
    private playerService: PlayerService
  ) { }

  ngOnInit() {
    // react to play state
    this._sub = this.store.select(s => s.playerModule.player).subscribe((state: IPlayerState) => {
      // update duration state for slider
      if (typeof state.duration !== 'undefined') {
        this.duration = state.duration;
        this.durationDisplay = this._timeDisplay(this.duration);
      }

      // update slider state
      if (state.playing) {
        this._subCurrentTime = this.playerService.currentTime$.subscribe((currentTime: number) => {
          this._updateSlider(currentTime);
        });
      } else if (this._subCurrentTime) {
        this._subCurrentTime.unsubscribe();
      }

      // completion should reset currentTime      
      if (state.completed) {
        this._updateSlider(0);
      }
    });
  }

  ngAfterViewInit() {
    this._screenWidth = screen.mainScreen.widthDIPs;
    console.log('screen.mainScreen.widthDIPs:', screen.mainScreen.widthDIPs);
    // console.log('screen.mainScreen.widthPixels:', screen.mainScreen.widthPixels);
    this._sliderArea = <View>this.sliderArea.nativeElement;
    this._slider = <Slider>this.slider.nativeElement;
    this._currentTimeDisplay = <Label>this.currentTimeDisplay.nativeElement;
    this._setupEventHandlers();
  }

  ngOnDestroy() {
    if (this._sub)
      this._sub.unsubscribe(); 
    if (this._subCurrentTime)
      this._subCurrentTime.unsubscribe();
  }

  private _updateSlider(time: number) {
    if (this._slider) this._slider.value = time;
    if (this._currentTimeDisplay)
      this._currentTimeDisplay.text = this._timeDisplay(time);
  }

  private _setupEventHandlers() {
    this._sliderArea.on(GestureTypes.touch, (args: any) => {
      this.playerService.seeking = true;
      let x = args.getX();
      // console.log('Touch: x: ' + x);
      if (x >= 0) {
        // x percentage of screen left to right
        let percent = x / this._screenWidth;
        if (percent > .5) {
          percent += .05;
        }
        // console.log('touch percentage of screen:', percent);
        let seekTo = this.duration * percent;
        // console.log('seek to:', seekTo);
        this._updateSlider(seekTo);

        if (this._seekDelay) clearTimeout(this._seekDelay);
        this._seekDelay = setTimeout(() => {
          // android requires milliseconds
          this.store.dispatch(new PlayerActions.SeekAction(isIOS ? seekTo : (seekTo * 1000)));
        }, 600);
      }
    });
  }

  private _timeDisplay(seconds: number): string {
    let hr: any  = Math.floor(seconds / 3600);
    let min: any = Math.floor((seconds - (hr * 3600))/60);
    let sec: any = Math.floor(seconds - (hr * 3600) -  (min * 60));
    if (min < 10) { 
      min = '0' + min; 
    }
    if (sec < 10){ 
      sec  = '0' + sec;
    }
    return min + ':' + sec;
  }
}