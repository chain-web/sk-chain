import { EventEmitter } from 'events';

type ListenCallback = (key: string, ...data: any) => void;

export class EventBus<T> extends EventEmitter {
  constructor(events: T) {
    super();
    this.events = events;
  }

  events: T;
  cbList: ListenCallback[] = [];

  /**
   *
   * @description 添加对某一事件key的监听
   */
  listen = (key: T, cb: ListenCallback) => {
    this.addListener(key as unknown as string, (...data) => {
      cb(key as unknown as string, ...data);
    });
  };

  /**
   * @description 添加对所有事件的监听
   */
  onEmit = (cb: ListenCallback) => {
    Object.keys(this.events).forEach((key) => {
      this.addListener(key, (...data) => {
        cb(key, ...data);
      });
    });
  };
}
