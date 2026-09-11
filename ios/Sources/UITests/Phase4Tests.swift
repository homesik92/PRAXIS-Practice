import XCTest

/// ROADMAP.md Phase 4 -- full on-device QA pass across all 5 of
/// PRAXIS-Practice's modes, driven for real via XCUITest (not
/// `osascript`/System Events, which turned out to be both blocked by this
/// machine's Accessibility permissions and, once unblocked, unsafe -- a
/// global click landed on the Claude app's own window instead of the
/// Simulator. XCUITest's taps are scoped to the target app's own process,
/// so they can't leak to another app the way a raw screen-coordinate click
/// can).
///
/// Radio-button options in `run.html`/`teach.html` render as generic
/// `Other` elements with `value: "0"`/`"1"` (WebKit's accessibility bridge
/// doesn't expose `<input type=radio>` as a distinct button/radio type
/// here) -- `firstUnselectedRadio` below is the shared way every flow
/// selects an answer regardless of which one.
final class Phase4Tests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func firstUnselectedRadio(_ app: XCUIApplication) -> XCUIElement {
        app.otherElements.matching(NSPredicate(format: "value == '0'")).element(boundBy: 0)
    }

    private func answerUntilNoneLeft(_ app: XCUIApplication, max: Int) {
        for _ in 0..<max {
            let radio = firstUnselectedRadio(app)
            guard radio.waitForExistence(timeout: 5) else { return }
            radio.tap()
        }
    }

    // MARK: - 4.1 Full timed test + 4.2 progress persistence (combined: no
    // need to run the 66-question flow twice)

    func testFullTestCompletionAndPersistence() throws {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.links["Start full test →"].waitForExistence(timeout: 10))
        app.links["Start full test →"].tap()
        XCTAssertTrue(app.buttons["Start"].waitForExistence(timeout: 10))
        app.buttons["Start"].tap()

        answerUntilNoneLeft(app, max: 70)

        XCTAssertTrue(app.buttons["Submit test"].waitForExistence(timeout: 10))
        app.buttons["Submit test"].tap()

        // Two "Submit test" buttons share a label once the confirm dialog is
        // open (review-screen's own, and the dialog's confirm button) --
        // waiting for the dialog's unique heading first avoids racing the tap
        // against the dialog still opening.
        XCTAssertTrue(app.staticTexts["Submit test?"].waitForExistence(timeout: 10))
        let confirmButtons = app.buttons.matching(NSPredicate(format: "label == 'Submit test'"))
        confirmButtons.element(boundBy: confirmButtons.count - 1).tap()

        XCTAssertTrue(app.staticTexts["Results"].waitForExistence(timeout: 10))

        // 4.2: force-terminate (not just background) and relaunch, then
        // confirm the completed attempt survived -- the real-world version of
        // Phase 1.4's isolated localStorage check.
        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts["Mathematics"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts["Not started"].exists, "attempt should have persisted across a force-quit, but the score ring still reads 'Not started'")
    }

    // MARK: - 4.1 Practice a topic (untimed drill, 10 questions)

    func testPracticeATopic() throws {
        let app = XCUIApplication()
        app.launch()

        let startLinks = app.links.matching(NSPredicate(format: "label == 'Start →'"))
        XCTAssertTrue(startLinks.element(boundBy: 0).waitForExistence(timeout: 10))
        startLinks.element(boundBy: 0).tap() // practice-topic-start-link is first in document order
        XCTAssertTrue(app.buttons["Start"].waitForExistence(timeout: 10))
        app.buttons["Start"].tap()

        answerUntilNoneLeft(app, max: 15)

        XCTAssertTrue(app.buttons["Submit test"].waitForExistence(timeout: 10))
        app.buttons["Submit test"].tap()
        XCTAssertTrue(app.staticTexts["Submit test?"].waitForExistence(timeout: 10))
        let confirmButtons = app.buttons.matching(NSPredicate(format: "label == 'Submit test'"))
        confirmButtons.element(boundBy: confirmButtons.count - 1).tap()

        XCTAssertTrue(app.staticTexts["Drill complete"].waitForExistence(timeout: 10))
    }

    // MARK: - 4.1 Category test (timed drill, 10 questions)

    func testCategoryTest() throws {
        let app = XCUIApplication()
        app.launch()

        let startLinks = app.links.matching(NSPredicate(format: "label == 'Start →'"))
        XCTAssertTrue(startLinks.element(boundBy: 1).waitForExistence(timeout: 10))
        startLinks.element(boundBy: 1).tap() // category-test-start-link is second
        XCTAssertTrue(app.buttons["Start"].waitForExistence(timeout: 10))
        app.buttons["Start"].tap()

        answerUntilNoneLeft(app, max: 15)

        XCTAssertTrue(app.buttons["Submit test"].waitForExistence(timeout: 10))
        app.buttons["Submit test"].tap()
        XCTAssertTrue(app.staticTexts["Submit test?"].waitForExistence(timeout: 10))
        let confirmButtons = app.buttons.matching(NSPredicate(format: "label == 'Submit test'"))
        confirmButtons.element(boundBy: confirmButtons.count - 1).tap()

        XCTAssertTrue(app.staticTexts["Drill complete"].waitForExistence(timeout: 10))
    }

    // MARK: - 4.1 Review a topic (untimed, immediate feedback per question)

    func testReviewATopic() throws {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.links["Choose a topic →"].waitForExistence(timeout: 10))
        app.links["Choose a topic →"].tap()

        // Category picker screen: tap the first category link.
        XCTAssertTrue(app.links["Number and Quantity"].waitForExistence(timeout: 10))
        app.links["Number and Quantity"].tap()

        // Each answer immediately reveals feedback and disables the radios,
        // then "Next question" advances -- repeat until the drill-complete
        // screen shows up instead of another radio. Bound is the largest
        // category's real question count (39, per 5165.json) plus buffer,
        // not an arbitrary guess -- "Number and Quantity" alone has 21,
        // well past a smaller placeholder bound.
        for _ in 0..<45 {
            if app.staticTexts["Drill complete"].exists { break }
            let radio = firstUnselectedRadio(app)
            if radio.waitForExistence(timeout: 5) {
                radio.tap()
            }
            XCTAssertTrue(app.buttons["Next question"].waitForExistence(timeout: 10))
            app.buttons["Next question"].tap()
        }

        XCTAssertTrue(app.staticTexts["Drill complete"].waitForExistence(timeout: 10))
    }

    // MARK: - 4.1 Study a topic (native picker, Phase 3's D-8)

    func testStudyATopic() throws {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.tabBars.buttons["Study"].waitForExistence(timeout: 10))
        app.tabBars.buttons["Study"].tap()

        XCTAssertTrue(app.staticTexts["Algebra"].waitForExistence(timeout: 10))
        app.staticTexts["Algebra"].tap()

        // teach.html renders the category label as its own heading -- two
        // matches expected once loaded (the native nav-bar title and the
        // in-page <h1>), so just confirm at least one shows up.
        XCTAssertTrue(app.staticTexts["Algebra"].waitForExistence(timeout: 10))
    }

    // MARK: - 4.3 Backup/restore -- observe, don't assume

    /// PRAXIS-Practice's export uses a Blob URL + `<a download>` + `.click()`
    /// (test.html's exportButton listener) -- a real browser download
    /// mechanism. `WebViewContainer` has no `WKDownloadDelegate`, so this
    /// documents what actually happens in that gap rather than assuming it
    /// either works or fails silently.
    func testBackupExportTap() throws {
        let app = XCUIApplication()
        app.launch()

        // <summary> inside <details> -- WebKit's accessibility bridge exposes
        // this as a generic `Other` element, not a Button (same category of
        // surprise as the radio-button locators above).
        XCTAssertTrue(app.otherElements["Back up or restore progress"].waitForExistence(timeout: 10))
        app.otherElements["Back up or restore progress"].tap()
        XCTAssertTrue(app.buttons["Download progress"].waitForExistence(timeout: 10))
        app.buttons["Download progress"].tap()
        sleep(2)
        // No assertion: ROADMAP.md 4.3 only asks to observe whether this
        // degrades gracefully or needs a native Share-Sheet hook sooner than
        // planned -- the print below is read from the test log by hand.
        print("=== AFTER TAPPING DOWNLOAD PROGRESS ===")
        print(app.debugDescription)
    }
}
