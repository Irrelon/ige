/*
* Copyright (c) 2011 Erin Catto http://box2d.org
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked as such, and must not be
* misrepresented as being the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/

/// Timer for profiling. This has platform specific code and may
/// not work on every platform.
export class b2Timer {
  public m_start: number = Date.now();

  /// Reset the timer.
  public Reset(): b2Timer {
    this.m_start = Date.now();
    return this;
  }

  /// Get the time since construction or the last reset.
  public GetMilliseconds(): number {
    return Date.now() - this.m_start;
  }
}

export class b2Counter {
  public m_count: number = 0;
  public m_min_count: number = 0;
  public m_max_count: number = 0;

  public GetCount(): number {
    return this.m_count;
  }

  public GetMinCount(): number {
    return this.m_min_count;
  }

  public GetMaxCount(): number {
    return this.m_max_count;
  }

  public ResetCount(): number {
    const count: number = this.m_count;
    this.m_count = 0;
    return count;
  }

  public ResetMinCount(): void {
    this.m_min_count = 0;
  }

  public ResetMaxCount(): void {
    this.m_max_count = 0;
  }

  public Increment(): void {
    this.m_count++;

    if (this.m_max_count < this.m_count) {
      this.m_max_count = this.m_count;
    }
  }

  public Decrement(): void {
    this.m_count--;

    if (this.m_min_count > this.m_count) {
      this.m_min_count = this.m_count;
    }
  }
}
