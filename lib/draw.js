/* for constucting SVGs */

function extend(src, dest) {
  return Object.assign({}, dest, src)
}
function assert(bool, message) {
  if (!bool) throw "Assertion failed! " + (message || "")
}

// set by SVG.init
var document
var xml

var directProps = {
  textContent: true,
}

var SVG = (module.exports = {
  init(window, makeCanvas) {
    document = window.document
    var DOMParser = window.DOMParser
    xml = new DOMParser().parseFromString("<xml></xml>", "application/xml")
    SVG.XMLSerializer = window.XMLSerializer

    SVG.makeCanvas = makeCanvas
  },

  cdata(content) {
    return xml.createCDATASection(content)
  },

  el(name, props) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", name)
    return SVG.setProps(el, props)
  },

  setProps(el, props) {
    for (var key in props) {
      var value = "" + props[key]
      if (directProps[key]) {
        el[key] = value
      } else if (/^xlink:/.test(key)) {
        el.setAttributeNS("http://www.w3.org/1999/xlink", key.slice(6), value)
      } else if (props[key] !== null && props.hasOwnProperty(key)) {
        el.setAttributeNS(null, key, value)
      }
    }
    return el
  },

  withChildren(el, children) {
    for (var i = 0; i < children.length; i++) {
      el.appendChild(children[i])
    }
    return el
  },

  group(children) {
    return SVG.withChildren(SVG.el("g"), children)
  },

  newSVG(width, height) {
    return SVG.el("svg", {
      version: "1.1",
      width: width,
      height: height,
    })
  },

  polygon(props) {
    return SVG.el(
      "polygon",
      extend(props, {
        points: props.points.join(" "),
      })
    )
  },

  path(props) {
    return SVG.el(
      "path",
      extend(props, {
        path: null,
        d: props.path.join(" "),
      })
    )
  },

  text(x, y, content, props) {
    var text = SVG.el(
      "text",
      extend(props, {
        x: x,
        y: y,
        textContent: content,
      })
    )
    return text
  },

  symbol(href) {
    return SVG.el("use", {
      "xlink:href": href,
    })
  },

  move(dx, dy, el) {
    SVG.setProps(el, {
      transform: ["translate(", dx, " ", dy, ")"].join(""),
    })
    return el
  },

  translatePath(dx, dy, path) {
    var isX = true
    var parts = path.split(" ")
    var out = []
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i]
      if (part === "A") {
        var j = i + 5
        out.push("A")
        while (i < j) {
          out.push(parts[++i])
        }
        continue
      } else if (/[A-Za-z]/.test(part)) {
        assert(isX)
      } else {
        part = +part
        part += isX ? dx : dy
        isX = !isX
      }
      out.push(part)
    }
    return out.join(" ")
  },

  /* shapes */

  rect(w, h, props) {
    return SVG.el(
      "rect",
      extend(props, {
        x: 0,
        y: 0,
        width: w,
        height: h,
      })
    )
  },

  ellipse(w, h, props) {
    return SVG.el(
      "ellipse",
      extend(props, {
        cx: w / 2,
        cy: h / 2,
        rx: w / 2,
        ry: h / 2,
      })
    )
  },

  arc(p1x, p1y, p2x, p2y, rx, ry) {
    var r = p2y - p1y
    return ["L", p1x, p1y, "A", rx, ry, 0, 0, 1, p2x, p2y].join(" ")
  },

  arcw(p1x, p1y, p2x, p2y, rx, ry) {
    var r = p2y - p1y
    return ["L", p1x, p1y, "A", rx, ry, 0, 0, 0, p2x, p2y].join(" ")
  },

  roundRect(w, h, props) {
    return SVG.rect(
      w,
      h,
      extend(props, {
        rx: 4,
        ry: 4,
      })
    )
  },

  pillRect(w, h, props) {
    var r = h / 2
    return SVG.rect(
      w,
      h,
      extend(props, {
        rx: r,
        ry: r,
      })
    )
  },

  pointedPath(w, h) {
    var r = h / 2
    return [
      "M",
      r,
      0,
      "L",
      w - r,
      0,
      w,
      r,
      "L",
      w,
      r,
      w - r,
      h,
      "L",
      r,
      h,
      0,
      r,
      "L",
      0,
      r,
      r,
      0,
      "Z",
    ]
  },

  pointedRect(w, h, props) {
    return SVG.path(
      extend(props, {
        path: SVG.pointedPath(w, h),
      })
    )
  },


  getTop(w) {
    return ["M", 0, 4,
      // "L", 1, 1,
      // "L", 4, 0,
      "Q", SVG.curve(0, 4, 4, 0, 0),
      ["L", 8, 0].join(" "),
      "c 2 0 3 1 4 2",
      "l 1.5 1.5",
      "c 1 1 2 2 4 2",
      "h 8",
      "c 2 0 3 -1 4 -2",
      "l 1.5 -1.5",
      "c 1 -1 2 -2 4 -2",
      "L", w - 4, 0,
      "Q", SVG.curve(w - 4, 0, w, 4, 0),
      "L", w, 4
    ].join(" ")
  },

  getRingTop(w) {
    return [
      "M",
      0,
      3,
      "L",
      3,
      0,
      "L",
      7,
      0,
      "L",
      10,
      3,
      "L",
      16,
      3,
      "L",
      19,
      0,
      "L",
      w - 3,
      0,
      "L",
      w,
      3,
    ].join(" ")
  },

  getRightAndBottom(w, y, hasNotch, inset) {
    if (typeof inset === "undefined") {
      inset = 0
    }
    //var arr = ["L", w, y - 3, "L", w - 3, y]
    var arr = ["L", w, y - 4, "Q", SVG.curve(w, y - 4, w - 4, y, 0)]
    if (hasNotch) {
      // arr = arr.concat([
      //   "L",
      //   inset + 30,
      //   y,
      //   "L",
      //   inset + 24,
      //   y + 5,
      //   "L",
      //   inset + 14,
      //   y + 5,
      //   "L",
      //   inset + 8,
      //   y,
      // ])
      arr = arr.concat([
        ["L", inset + 35, y].join(" "),
        "c -2 0 -3 1 -4 2",
        "l -1.5 1.5",
        "c -1 1 -2 2 -4 2",
        "h -8",
        "c -2 0 -3 -1 -4 -2",
        "l -1.5 -1.5",
        "c -1 -1 -2 -2 -4 -2",
      ])
    }
    if (inset === 0) {
      arr.push("L", inset + 4, y)
      arr.push("a 4 4 0 0 1 -4 -4")
    } else {
      arr.push("L", inset + 4, y)
      arr.push("a 4 4 0 0 0 -4 4")
    }
    return arr.join(" ")
  },

  getArm(w, armTop) {
    return [
      "L", 10, armTop - 4,
      "a -4 -4 0 0 0 4 4",
      "L", w - 4, armTop,
      "a 4 4 0 0 1 4 4"
    ].join(" ")
  },
  
  

  stackRect(w, h, props) {
    return SVG.path(
      extend(props, {
        path: [SVG.getTop(w), SVG.getRightAndBottom(w, h, true, 0), "Z"],
      })
    )
  },

  capPath(w, h) {
    return [SVG.getTop(w), SVG.getRightAndBottom(w, h, false, 0), "Z"]
  },

  ringCapPath(w, h) {
    return [SVG.getRingTop(w), SVG.getRightAndBottom(w, h, false, 0), "Z"]
  },

  capRect(w, h, props) {
    return SVG.path(
      extend(props, {
        path: SVG.capPath(w, h),
      })
    )
  },

  hatRect(w, h, props) {
    return SVG.path(extend(props, {
      path: [
        "M 0 12",
        "c 14,-15 52,-15 66,0",
        ["L", w - 4, 12].join(" "),
        "a 4 4 0 0 1 4 4",
        SVG.getRightAndBottom(w, h, true),
        "Z",
      ],
    }));
  },

  curve(p1x, p1y, p2x, p2y, roundness) {
    var roundness = roundness || 0.42
    var midX = (p1x + p2x) / 2.0
    var midY = (p1y + p2y) / 2.0
    var cx = Math.round(midX + roundness * (p2y - p1y))
    var cy = Math.round(midY - roundness * (p2x - p1x))
    return [cx, cy, p2x, p2y].join(" ")
  },

  procHatBase(w, h, archRoundness, props) {
    // TODO use arc()
    // var archRoundness = Math.min(0.2, 35 / w); //used in scratchblocks2
    return SVG.path(extend(props, {
      path: [
        "M", 0, h-3,
        "L", 0, 10,
        "Q", SVG.curve(0, 10, 15, -5, 0),
        "L", w-15, -5,
        "Q", SVG.curve(w-15, -5, w, 10, 0),
        SVG.getRightAndBottom(w, h, true),
      ],
    }));
  },

  procHatCap(w, h, archRoundness) {
    // TODO use arc()
    // TODO this doesn't look quite right
    return SVG.path({
      path: [
        "M",
        -1,
        13,
        "Q",
        SVG.curve(-1, 13, w + 1, 13, archRoundness),
        "Q",
        SVG.curve(w + 1, 13, w, 16, 0.6),
        "Q",
        SVG.curve(w, 16, 0, 16, -archRoundness),
        "Q",
        SVG.curve(0, 16, -1, 13, 0.6),
        "Z",
      ],
      class: "sb-define-hat-cap",
    })
  },

  procHatRect(w, h, props) {
    var q = 52
    var y = h - q

    var archRoundness = Math.min(0.2, 35 / w)

    return SVG.move(
      0,
      y,
      SVG.group([
        SVG.procHatBase(w, q, archRoundness, props),
        //SVG.procHatCap(w, q, archRoundness),
      ])
    )
  },

  mouthRect(w, h, isFinal, lines, props) {
    var y = lines[0].height
    var p = [SVG.getTop(w), SVG.getRightAndBottom(w, y, true, 10)]
    for (var i = 1; i < lines.length; i += 2) {
      var isLast = i + 2 === lines.length

      y += lines[i].height - 3
      p.push(SVG.getArm(w, y))

      var hasNotch = !(isLast && isFinal)
      var inset = isLast ? 0 : 10
      y += lines[i + 1].height + 3
      p.push(SVG.getRightAndBottom(w, y, hasNotch, inset))
    }
    p.push("Z")
    return SVG.path(
      extend(props, {
        path: p,
      })
    )
  },

  ringRect(w, h, cy, cw, ch, shape, props) {
    var r = 8
    var func =
      shape === "reporter"
        ? SVG.roundRect
        : shape === "boolean"
          ? SVG.pointedPath
          : cw < 40 ? SVG.ringCapPath : SVG.capPath
    return SVG.rect(
      w,
      h,
      extend(props, {
        rx: 4,
        ry: 4,
      })
    )
  },

  commentRect(w, h, props) {
    var r = 6
    return SVG.path(
      extend(props, {
        class: "sb-comment",
        path: [
          "M",
          r,
          0,
          SVG.arc(w - r, 0, w, r, r, r),
          SVG.arc(w, h - r, w - r, h, r, r),
          SVG.arc(r, h, 0, h - r, r, r),
          SVG.arc(0, r, r, 0, r, r),
          "Z",
        ],
      })
    )
  },

  commentLine(width, props) {
    return SVG.move(
      -width,
      9,
      SVG.rect(
        width,
        2,
        extend(props, {
          class: "sb-comment-line",
        })
      )
    )
  },

  strikethroughLine(w, props) {
    return SVG.path(
      extend(props, {
        path: ["M", 0, 0, "L", w, 0],
        class: "sb-diff sb-diff-del",
      })
    )
  },
})
